const admin = require('firebase-admin');
const docs = 'resumes/docs'
const pdf = 'resumes/pdf'
const thumbs = 'resumes/thumbs'

const serviceAccount = require("./../serviceAccountkey.json");
const firebaseConfig = require("./firebaseConfig");
const firebase = require('./firebaseConnect');

const BUCKET_NAME = firebaseConfig.storageBucket;
const DB_URL = firebaseConfig.databaseURL;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: DB_URL
});

var bucket = admin.storage().bucket(BUCKET_NAME);

// var starCountRef = firebase.database().ref('posts/' + postId + '/starCount');
// starCountRef.on('value', function (snapshot) {
//     console.log(snapshot)
// });

module.exports = {

    uploadToCloud(filename, type) {
        return new Promise(async (resolve, reject) => {
            var directory = (type === 'PDF') ? pdf : thumbs;
            var file = (type === 'PDF') ? `./files/pdf/${filename}` : `./files/thumbs/${filename}`;
            await bucket.upload(file, {
                gzip: true,
                destination: `${directory}/${filename}`,
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            }).then(new_file => {
                resolve({ success: true, msg: 'Uploaded' });
            });
        });
    },

    downloadFromCloud(filename) {
        return new Promise(async (resolve, reject) => {
            let destFilename = `./files/docs/${filename}`;
            const options = {
                destination: destFilename,
            };
            await bucket.file(`${docs}/${filename}`).download(options).then(result => {
                resolve({ success: true, msg: 'Downloaded' });
            });
        });
    },

    saveDataToRealTimeDB(data) {
        return new Promise(async (resolve, reject) => {
            firebase.database().ref('users').push({
                name: data.name,
                email: data.email,
                role: data.role
            })
            resolve('Succesfully added')
        });
    }

};




