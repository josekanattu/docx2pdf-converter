const express = require('express');
const fs = require('fs');
const path = require('path')
const { PDFNet } = require('@pdftron/pdfnet-node');
const mimeType = require('./mimeType');

const app = express();

app.get('/convertToPdf/:filename', function (req, res) {
    convertToPdf(req, res);
})

convertToPdf = (req, res) => {
    const filename = req.params.filename;
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
