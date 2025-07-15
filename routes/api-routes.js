// routes/api-routes.js

const express = require('express');
const router = express.Router();
const breezeApi = require('../services/breeze-api');
const authCheck = require('../middleware/authCheck'); // Corrected path to authCheck middleware

// Define the fields we want to request from the Breeze API for each person.
const BASIC_PEOPLE_FIELDS = ['id', 'first_name', 'last_name']; 
const PHONE_FIELD_ID = '1413026988'; 

// Helper function to recursively fetch tags for folders and their children
async function fetchAndNestTags(folderNode, allFolders) {
    const tagsInCurrentFolder = await breezeApi.getTagsInFolder(folderNode.id);
    tagsInCurrentFolder.forEach(tag => {
        folderNode.tags.push({ ...tag, type: 'tag', checked: false });
    });

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
router.get('/people', authCheck, async (req, res) => {
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
            // console.log(`Successfully received and merged basic people data for ${people.length} unique people from selected tags.`); // Removed debug
        } else {
            // console.log('No tags selected, fetching all people (basic fields).'); // Removed debug
            people = await breezeApi.getPeople({ fields_json: basic_fields_json }); 
            // console.log('Successfully received all basic people data from Breeze API (no tag filter applied).'); // Removed debug
        }

        const detailedPeoplePromises = people.map(async (person) => {
            try {
                // console.log(`Fetching detailed profile for person ID: ${person.id}`); // Removed debug
                const detailedPersonResponse = await breezeApi.getPeopleById(person.id); 
                
                if (detailedPersonResponse && detailedPersonResponse.details) {
                    person.details = detailedPersonResponse.details;
                    // console.log(`Merged details for person ID: ${person.id}`); // Removed debug
                } else {
                    // console.log(`No details found for person ID: ${person.id}`); // Removed debug
                }
            } catch (detailError) {
                console.error(`Error fetching detailed profile for ID ${person.id}:`, detailError.message);
            }
            return person; 
        });

        const peopleWithDetails = await Promise.all(detailedPeoplePromises);

        // if (peopleWithDetails && peopleWithDetails.length > 0) { // Removed debug
        //     console.log('First 2 people objects received (with details):', peopleWithDetails.slice(0, 2));
        // } else {
        //     console.log('No people data received or array is empty for given parameters.');
        // }

        res.json(peopleWithDetails); 

    } catch (error) {
        console.error('Error fetching people in api-routes:', error);
        res.status(500).json({ message: 'Failed to fetch people', error: error.message });
    }
});

// API route to get structured tags and folders for the filter UI
router.get('/tags', authCheck, async (req, res) => {
    try {
        const folders = await breezeApi.getTagFolders(); 

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
            await fetchAndNestTags(folderNode, folders); 
            tagTree.push(folderNode);
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
        res.status(500).json({ message: 'Failed to fetch and structure tags', error: error.message });
    }
});

// API route to send SMS (assuming you have Twilio setup)
router.post('/send-sms', authCheck, async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ message: 'Phone number and message are required.' });
    }

    try {
        const response = await breezeApi.sendSms(to, message); 
        console.log('SMS sending initiated. Response:', response); 
        res.json({ message: 'SMS sent successfully', sids: response.sids });
    } catch (error) {
        console.error('Error sending SMS in api-routes:', error);
        res.status(500).json({ message: 'Failed to send SMS', error: error.message });
    }
});

module.exports = router;
