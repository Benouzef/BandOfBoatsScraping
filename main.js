const d3 = require('d3');
const fs = require('fs');
const stdio = require('stdio');
const axios = require('axios');
const cheerio = require('cheerio');

let boatsToBeProcessed = [];
let processedBoats = [];
let processedVendors = [];
let processedVendorsResult = [];

const baseUrl = 'https://www.bandofboats.com';
const defaultWaitTimeInMs = 1000;

var ops = stdio.getopt({
	csvFile: {description: 'Input : CSV File Name', key: 'c', args: 1, mandatory: true},
	boatsFile: {description: 'Output : json result file for Boats - overwritten if exists', key: 'b', args: 1, mandatory: false},
	vendorsFile: {description: 'Output : json result file for vendors - overwritten if exists', key: 'v', args: 1, mandatory: false}
});

// Check if input file exists
try {
    if (fs.existsSync(ops.csvFile)) {
        ProcessCSVFile(ops.csvFile);
    } else {
        console.error('Input File does not exist: ' + ops.csvFile)
    }
} catch(err) {
  console.error(err)
}

// Process Input CSV File
async function ProcessCSVFile(filename) {
    console.log('Processing... : ' + filename);

    var raw = fs.readFileSync(filename, 'utf8');
    boatsToBeProcessed = d3.csvParse(raw);
    console.log('Total # of boats to be processed : ' + boatsToBeProcessed.length);

    var pbar = stdio.progressBar(boatsToBeProcessed.length, 1);
    pbar.onFinish(function () {
        if (processedBoats.length != boatsToBeProcessed.length) {
            console.error("ERROR: Some boats have not been properly processed!")
        }
        let data = JSON.stringify(processedBoats);  
        fs.writeFileSync(ops.boatsFile, data, {encoding:'utf8',flag:'w+'}); 

        data = JSON.stringify(processedVendorsResult);  
        fs.writeFileSync(ops.vendorsFile, data, {encoding:'utf8',flag:'w+'}); 

        data = JSON.stringify(boatsToBeProcessed);  
        fs.writeFileSync('test.json', data, {encoding:'utf8',flag:'w+'}); 
        
        console.log('DONE!!! (Please review results if errors have been thrown during execution!)');
    });

    for (i = 0; i < boatsToBeProcessed.length; i++) {
        await getDataForASingleBoat(boatsToBeProcessed[i].link, i);
        await sleep(defaultWaitTimeInMs);
        pbar.tick();
    }
}

async function getDataForASingleBoat (url, i) {
    await axios.get(url)
    .then((response) => {
        if(response.status === 200) {
            var timestamp = Date.now();

            html = response.data;
            $ = cheerio.load(html); 
            
            let keyCars = [];
            // Check that some "Caractéristiques clés" are available for this boat
            if ($('span[class="titleKey"]', 'div[id="description"]').text() == "Caractéristiques clés") {
                
                $('ul[class="lstDetails"]', 'div[id="description"]').find('li').each(function(i, elem){
                    let key = $(elem.childNodes[0]).text().trim();
                    if (key.endsWith(':')) {
                        key = key.substring(0, key.length-1);
                    } 

                    let value = $(elem.childNodes[1]).text().trim();
                    let detail = { key, value };
                    
                    keyCars.push(detail);

                }); 
            };
            
            

            // Getting vendorUrl and then browsing to it
            let vendorUrl = "";
            if ($('a[class="fap-link"]', 'div[class="sold"]').length === 1) {
                vendorUrl = baseUrl + $('a[class="fap-link"]', 'div[class="sold"]')[0].attribs.href;
            };
            
            boat = {
                i,
                url,
                timestamp,
                keyCars,
                vendorUrl
            } 

            processedBoats.push(boat);
            boatsToBeProcessed[i].done = 'Y';
            boatsToBeProcessed[i].timestamp = timestamp;
            
            return vendorUrl;
            
        }
    }, 
        (error) => console.log(error)
    ).then((vendorUrl) => {
        if (vendorUrl != "") {
            getDataForBoatVendor(vendorUrl);
        }
    },
        (error) => console.log(error)
    );
} 

async function getDataForBoatVendor (url) {

    if (processedVendors.find((elem) => { return elem == url; }) == undefined) {
        processedVendors.push(url);

        await sleep(defaultWaitTimeInMs);
        await axios.get(url)
        .then((response) => {
            if(response.status === 200) {
                html = response.data;
                $ = cheerio.load(html); 

                if ($('a[id="btnCallOffice"]').length === 1) {
                    phone = $('a[id="btnCallOffice"]')[0].attribs.rel;
                }
                if ($('a[id="btnEmailOffice"]').length === 1) {
                    mail = $('a[id="btnEmailOffice"]')[0].attribs.rel;
                }

                vendor = {
                    url,
                    phone,
                    mail
                }

                processedVendorsResult.push(vendor);
            }
        }, 
            (error) => console.log(error)
        );
    }
} 

// Function to wait a given amount of time between clicks
function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}