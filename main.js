const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

let boatsToScrape = [];
let results = [];
const baseUrl = 'https://www.bandofboats.com';
const listUrl = baseUrl + '/fr/buy/boat?_locale=fr&sort=publication_desc&page=';

mainScraping().then(() =>{
    console.log(boatsToScrape.length);
}).then(() => {
    boatInfoScraping().then(() => {
        console.log(results.length);
    })
});

async function mainScraping() { 
    for(i = 1; i <= 2; i++){ // TODO : manage the number of pages to scrape
        console.log(listUrl + i);
        await getDataForBoats(listUrl + i);
        await sleep(2000);
    }
}

async function boatInfoScraping(){
    for (j = 0; j < boatsToScrape.length; j++){
        console.log(baseUrl + boatsToScrape[j]);
        await getDataForASingleBoat(baseUrl, boatsToScrape[j], j)
        await sleep(3000);
    } 
} 

async function getDataForBoats (url) {
    await axios.get(url)
    .then((response) => {
        if(response.status === 200) {
            html = response.data;
            $ = cheerio.load(html); 
            
            $('div[class=oneAd]', 'div[id=search-boats-results]').find('a').each(function(i, elem){
                console.log(url + ' : ' + elem.attribs.href);
                
                boatItem = elem.attribs.href;

                boatsToScrape.push(boatItem);
            }); 
            console.log(boatsToScrape)
        }
    }, 
        (error) => console.log(error)
    );
} 

async function getDataForASingleBoat (url, boat, j) {
    await axios.get(url + boat)
    .then((response) => {
        if(response.status === 200) {
            html = response.data;
            $ = cheerio.load(html); 

            // Check that some "Caractéristiques clés" are available for this boat
            if ($('span[class="titleKey"]', 'div[id="description"]').text() == "Caractéristiques clés") {
                
                $('ul[class="lstDetails"]', 'div[id="description"]').find('li').each(function(i, elem){
                    console.log($(elem).text());
                }); 
            } ;

            // Getting vendorUrl and then browsing to it
        
            let vendorUrl = "";
            console.log($('a[class="fap-link"]', 'div[class="sold"]').length);
            if ($('a[class="fap-link"]', 'div[class="sold"]').length === 1) {
                vendorUrl = baseUrl + $('a[class="fap-link"]', 'div[class="sold"]')[0].attribs.href;
            };
            
            console.log(vendorUrl);
            
            return vendorUrl;
            /*result = {
                j,
                company,
                companyUrl,
                email,
                address,
                contact,
                tel
            } 
            console.log(result);
            results.push(result);*/
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
    await axios.get(url)
    .then((response) => {
        if(response.status === 200) {
            html = response.data;
            $ = cheerio.load(html); 

            console.log($('h1[class="title"]').text());
            if ($('a[id="btnCallOffice"]').length === 1) {
                console.log($('a[id="btnCallOffice"]')[0].attribs.rel);
            }
            if ($('a[id="btnEmailOffice"]').length === 1) {
                console.log($('a[id="btnEmailOffice"]')[0].attribs.rel);
            }
        }
    }, 
        (error) => console.log(error)
    );
} 

// Function to wait a given amount of time between clicks
function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}