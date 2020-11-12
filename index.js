const express = require('express');
const fs = require('fs');
const path = require('path')
const bodypaser = require('body-parser')
const { PDFNet } = require('@pdftron/pdfnet-node');
const mimeType = require('./mimeType');
const firebaseService = require('./services/firebaseService');
const firebase = require('./services/firebaseConnect');
const firebaseConfig = require("./services/firebaseConfig");

const fetch = require('node-fetch');

const app = express();
app.use(bodypaser.json());
app.use(bodypaser.urlencoded());

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html')
})


app.get('/convertFileFromCloud/:filename', function (req, res) {
    var file = req.params.filename;
    convertFileFromCloud(req, res, file);
})

convertFileFromCloud = (req, res, filename) => {
    firebaseService.downloadFromCloud(filename).then(data => {
        convertToPdf(req, res, filename)
    });
}

app.get('/createDynamicLink', function (req, res) {

    const body = {
        "dynamicLinkInfo": {
            "domainUriPrefix": firebaseConfig.domainUriPrefix,
            "link": "https://www.google.com/",
            "androidInfo": {
                "androidPackageName": "com.example.android"
            },
            "iosInfo": {
                "iosBundleId": "com.example.ios"
            }
        }
    }

    fetch(`https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${firebaseConfig.apiKey}`, {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    })
        .then(res => res.json())
        .then(json => console.log(json));
})

app.post('/saveUsersData', function (req, res) {
    var data = req.body
    firebase.database().ref('users').push({
        name: data.name,
        email: data.email,
        role: data.role
    })
    res.send('Succesfully added')
})

app.post('/saveEventsData', function (req, res) {
    var data = req.body
    firebase.database().ref('events').push({
        title: data.title,
        time: data.time,
        date: data.date
    })
    res.send('Succesfully added')
})

app.post('/savePostData', function (req, res) {
    var data = req.body
    firebase.database().ref('posts').push({
        id: data.id,
        starCount: data.starCount,
    })
    res.send('Succesfully added')
})

app.post('/getPostData', function (req, res) {
    var data = req.body
    var postRef = firebase.database().ref();
    var oneRef = postRef.child('posts').orderByChild('id').equalTo(data.postId);
    oneRef.once('value', function (snap) {
        res.status(200).json({ "post": snap.val() });
    })
})

app.post('/updatePostData', function (req, res) {
    var data = req.body
    var postRef = firebase.database().ref();
    var oneRef = postRef.child('posts').orderByChild('id').equalTo(data.postId);
    oneRef.once('value', function (snap) {

        var postData = snap.val();

        snap.forEach(function (childSnapshot) {

            postRef.child('posts/' + childSnapshot.key).update({
                starCount: parseInt(postData[childSnapshot.key].starCount) + 1
            }, function (error) {
                if (error) {
                    res.status(200).json({ "status": 'Failed', msg: error });
                } else {
                    res.status(200).json({ "status": 'Success' });
                }
            });
        });
    })
})

app.get('/getPublicUrl', function (req, res) {
    const { Storage } = require('@google-cloud/storage')
    const gcs = new Storage({
        keyFilename: 'serviceAccountkey.json'
    });
    const bucket = gcs.bucket(firebaseConfig.storageBucket);
    const file = bucket.file('resumes/pdf/resume-ram kumar.pdf');

    return file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
    }).then(signedUrls => {
        res.json({ "status": 'Success', url: signedUrls[0] });
    });
})

app.get('/convertToPdf/:filename', function (req, res) {
    const filename = req.params.filename;
    convertToPdf(req, res, filename);
})

convertToPdf = (req, res, filename) => {
    let ext = path.parse(filename).ext;
    let file = path.parse(filename).name;

    const inputPath = path.resolve(__dirname, `./files/docs/${filename}`);
    const outputPath = path.resolve(__dirname, `./files/pdf/${file}.pdf`);

    if (ext === '.pdf') {
        res.statusCode = 500;
        res.end(`File is already PDF.`);
    }

    const main = async () => {
        const pdfdoc = await PDFNet.PDFDoc.create();
        await pdfdoc.initSecurityHandler();
        await PDFNet.Convert.toPdf(pdfdoc, inputPath);
        pdfdoc.save(outputPath, PDFNet.SDFDoc.SaveOptions.e_linearized);
        generateThumbnail(file);

        firebaseService.uploadToCloud(`${file}.pdf`, 'PDF').then(data => {
            console.log(data)
        });
    };

    PDFNetEndpoint(main, outputPath, res);
}

generateThumbnail = (file) => {
    const inputPath = path.resolve(__dirname, `./files/pdf/${file}.pdf`);
    const outputPath = path.resolve(__dirname, `./files/thumbs/${file}.png`);

    const main = async () => {
        const doc = await PDFNet.PDFDoc.createFromFilePath(inputPath);
        await doc.initSecurityHandler();
        const pdfdraw = await PDFNet.PDFDraw.create(92);
        const currPage = await doc.getPage(1);
        await pdfdraw.export(currPage, outputPath, 'PNG');
        firebaseService.uploadToCloud(`${file}.png`, 'PNG').then(data => {
            console.log(data)
        });
    };

    PDFNet.runWithCleanup(main, process.env.PDFTRONKEY)
        .then(() => {
            PDFNet.shutdown();
        })
        .catch(error => {
            console.log(error)
        });
}

const PDFNetEndpoint = (main, pathname, res) => {
    PDFNet.runWithCleanup(main, process.env.PDFTRONKEY) // you can add the key to PDFNet.runWithCleanup(main, process.env.PDFTRONKEY)
        .then(() => {
            PDFNet.shutdown();
            fs.readFile(pathname, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.end(`Error getting the file: ${err}.`);
                } else {
                    const ext = path.parse(pathname).ext;
                    res.setHeader('Content-type', mimeType[ext] || 'text/plain');
                    res.end(data);
                }
            });
        })
        .catch(error => {
            res.statusCode = 500;
            res.end(error);
        });
};

app.listen(3000, () => {
    console.log('Listen to 3000')
})
