// routes/api-routes.js

const express = require('express');
const router = express.Router();
const breezeApi = require('../services/breeze-api');
const smsService = require('../services/sms-service');
const db = require('../utils/db');

// Define the fields we want to request from the Breeze API for each person.
const BASIC_PEOPLE_FIELDS = ['id', 'first_name', 'last_name'];

// Helper function to recursively fetch tags for folders and their children
async function fetchAndNestTags(folderNode, allFolders) {
    const tagsInCurrentFolder = await breezeApi.getTagsInFolder(folderNode.id);
    // Ensure tagsInCurrentFolder is an array before using forEach
    if (Array.isArray(tagsInCurrentFolder)) {
        tagsInCurrentFolder.forEach(tag => {
            folderNode.tags.push({ ...tag, type: 'tag', checked: false });
        });
    } else {
        console.error(`[fetchAndNestTags] Expected tagsInCurrentFolder to be an array for folder ID ${folderNode.id}, but got:`, tagsInCurrentFolder);
    }

    const childrenFolders = allFolders.filter(f => f.parent_id === folderNode.id);
    for (const childFolder of childrenFolders) {
        const childNode = {
            id: childFolder.id,
            name: childFolder.name,
            parent_id: childFolder.parent_id,
            type: 'folder',
            children: [],
            tags: [],
            expanded: false
        };
        await fetchAndNestTags(childNode, allFolders);
        folderNode.children.push(childNode);
    }
}

// API route to get people from Breeze
router.get('/people', async (req, res) => {
    try {
        const tagIdsRaw = req.query.tag_id; 
        let people = [];

        let selectedTagIdsArray = [];
        if (tagIdsRaw) {
            if (Array.isArray(tagIdsRaw)) {
                selectedTagIdsArray = tagIdsRaw.map(String); 
            } else {
                selectedTagIdsArray = [String(tagIdsRaw)]; 
            }
        }

        const basic_fields_json = JSON.stringify(BASIC_PEOPLE_FIELDS);

        if (selectedTagIdsArray.length > 0) {
            const uniquePeopleMap = new Map(); 

            for (const tagId of selectedTagIdsArray) {
                const prefixedTagId = `y_${tagId}`; 
                const filter = {
                    'tag_contains': prefixedTagId
                };
                const filter_json = JSON.stringify(filter);

                const peopleForTag = await breezeApi.getPeople({ filter_json: filter_json, fields_json: basic_fields_json });

                if (peopleForTag && peopleForTag.length > 0) {
                    peopleForTag.forEach(person => {
                        uniquePeopleMap.set(person.id, person); 
                    });
                }
            }
            people = Array.from(uniquePeopleMap.values());
            console.log(`Successfully received and merged basic people data for ${people.length} unique people from selected tags.`);
        } else {
            console.log('No tags selected, fetching all people (basic fields).');
            people = await breezeApi.getPeople({ fields_json: basic_fields_json }); 
            console.log('Successfully received all basic people data from Breeze API (no tag filter applied).');
        }

        const detailedPeoplePromises = people.map(async (person) => {
            try {
                const detailedPersonResponse = await breezeApi.getPeopleById(person.id); 
                
                if (detailedPersonResponse && detailedPersonResponse.details) {
                    person.details = detailedPersonResponse.details;
                }
            } catch (detailError) {
                console.error(`Error fetching detailed profile for ID ${person.id}:`, detailError.message);
            }
            return person; 
        });

        const peopleWithDetails = await Promise.all(detailedPeoplePromises);

        res.json(peopleWithDetails); 

    } catch (error) {
        console.error('Error fetching people in api-routes:', error);
        res.status(500).json({ message: 'Failed to fetch people', error: error.message });
    }
});

// API route to get structured tags and folders for the filter UI
router.get('/tags', async (req, res) => {
    try {
        const folders = await breezeApi.getTagFolders(); 
        
        // IMPORTANT: Add check for 'folders' being an array before proceeding
        if (!Array.isArray(folders)) {
            console.error('[api-routes] breezeApi.getTagFolders() did not return an array. Received:', folders);
            return res.status(500).json({ message: 'Failed to fetch tags: Invalid data format from Breeze API.', receivedData: folders });
        }

        const tagTree = [];
        const folderMap = new Map(); 

        folders.forEach(folder => { 
            folderMap.set(folder.id, {
                id: folder.id,
                name: folder.name,
                parent_id: folder.parent_id,
                type: 'folder',
                children: [], 
                tags: [],     
                expanded: false 
            });
        });

        const topLevelFolders = folders.filter(f => f.parent_id === '0');
        for (const folder of topLevelFolders) {
            const folderNode = folderMap.get(folder.id);
            if (folderNode) { // Ensure folderNode exists before processing
                await fetchAndNestTags(folderNode, folders); 
                tagTree.push(folderNode);
            } else {
                console.warn(`[api-routes] Top-level folder with ID ${folder.id} not found in folderMap.`);
            }
        }

        const sortNodes = (nodes) => {
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            nodes.forEach(node => {
                if (node.children) sortNodes(node.children);
                if (node.tags) node.tags.sort((a, b) => a.name.localeCompare(b.name));
            });
        };
        sortNodes(tagTree);

        console.log('Successfully retrieved and structured tags and folders for frontend.');
        res.json(tagTree);

    } catch (error) {
        console.error('Error fetching and structuring tags/folders in api-routes:', error);
        res.status(500).json({ message: 'Failed to fetch tags', error: error.message });
    }
});

// API route to send SMS
router.post('/send-sms', async (req, res) => {
    // Destructure new fields: recipientName and senderName
    const { to, message, recipientName, senderName } = req.body; 

    if (!to || !message || !recipientName || !senderName) { // Validate new fields
        return res.status(400).json({ message: 'Phone number, message, recipient name, and sender name are required.' });
    }

    try {
        // Access the user ID from the authenticated request
        const senderUserId = req.user.id; // Assuming req.user.id holds the authenticated user's ID
        console.log(`[api-routes] Sending SMS. Sender User ID: ${senderUserId}, Sender Name: ${senderName}, Recipient Name: ${recipientName}`); // Debug log

        // Use the new smsService to send the SMS, passing all required parameters
        const response = await smsService.sendSms(to, message, senderUserId, recipientName, senderName); 
        console.log('SMS sending initiated. Response:', response); 
        
        // Check the success property from the response object
        if (response.success) {
            res.json({ message: 'SMS sent successfully', sids: response.sids });
        } else {
            // If smsService.sendSms returns success: false, it means all individual messages failed.
            res.status(500).json({ message: 'Failed to send SMS: All messages failed to initiate.', sids: response.sids });
        }
    } catch (error) {
        console.error('Error sending SMS in api-routes:', error);
        res.status(500).json({ message: 'Failed to send SMS', error: error.message });
    }
});

// API route to get SMS history
router.get('/sms-history', (req, res) => {
    try {
        // Fetch all SMS records from the database, including new name fields
        const records = db.getDb().prepare('SELECT * FROM sms_records ORDER BY createdAt DESC').all();
        console.log(`Fetched ${records.length} SMS records from database.`);
        res.json(records);
    }
    catch (error) {
        console.error('Error fetching SMS history from database:', error.message);
        res.status(500).json({ message: 'Failed to fetch SMS history', error: error.message });
    }
});


module.exports = router;
