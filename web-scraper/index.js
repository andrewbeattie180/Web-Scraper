const puppeteer = require('puppeteer'); // Have decided to use Puppeteer as it can view dynamically loaded web pages
const parse5 = require('parse5');       // parse5 appears to be a good tool to parse HTML


const scraper = {
    checkDomainIsSecure(url){
        const pattern = /https:\/\//;
        return pattern.test(url)
    },
    findDomain(url){
        url = url.replace('http://','')
        .replace('https://','')
        .replace('www.','')
        .split('/')[0];
        return url;   
    },
    findUniqueDomains(array){
        let uniqueArray = [];
        for (let i=0;i<array.length;i++){
            if (uniqueArray.indexOf(array[i]) === -1){
                uniqueArray.push(array[i])
            }
        }
        return uniqueArray;

    },
    findInArrayOfObjects(tag,array){
        let section;
        for (let i =0; i<array.length;i++){
            if (array[i].tagName === tag){
                section = array[i];
            }
        }
        return section; 
    },
    searchArray(array,outputArray,tag){
        if(typeof array === 'object'){
           for (let i = 0; i<array.length;i++){
               if (array[i].tagName && array[i].tagName === tag){    // Looks through the array for the tag
                   outputArray.push(array[i])                       // Adds the correct tag value to the resulting array
               } else if(array[i].childNodes){                     // Recursively loops over the html branches
                   this.searchArray(array[i].childNodes,outputArray,tag)
               }
           }
       }
    },
    findScripts(arrayOfObjects){
        let scripts = [];
        this.searchArray(arrayOfObjects,scripts,'script')
        scripts=scripts.map(script=>parse5.serialize(script.parentNode));
        // return scripts;
        let result = scripts.filter(script=>{
            let pattern = /(gtag.js|analytics.js|ga.js)/gi;
            if (pattern.test(script)){
                return script
            }
        })

        return result;

    },
    findLinks(arrayOfObjects){
        let links = [];
        this.searchArray(arrayOfObjects,links,'a');
        links=links.map(link=>link.attrs[0].value);
        return links.filter(link =>{
            let pattern = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/
            if (pattern.test(link)){
                return link
            }
        })
    },
    process(url){
    let self = this; //to make sure the scope isn't lost;
       puppeteer.launch()
       .then(browser => browser.newPage()
       )
       .then(page => page.goto(url)
           .then(()=> page.content()
           )
       )
       .then(html =>{
           const document = parse5.parse(html);
           return document;
       })
       .then(document =>{
        let html = document.childNodes[1].childNodes;
        let head = self.findInArrayOfObjects('head',html);
        let body = self.findInArrayOfObjects('body',html);
        let title = self.findInArrayOfObjects('title',head.childNodes)
        let security = self.checkDomainIsSecure(url)?'This website is secure':'This website is not secure'
        let links = self.findLinks(body.childNodes);
        let scripts = self.findScripts(html);
        let uniqueDomains = self.findUniqueDomains(links.map(link=>{ return self.findDomain(link)}));
        console.log(`Website title is ${title.childNodes[0].value}`);
        console.log(security);
        console.log(`Clickable links: ${links.length}`);
        console.log(`Number of unique domains:  ${uniqueDomains.length}`);
        console.log(`Unique website domains: ${uniqueDomains}`);
        console.log("Scripts");
        console.log(scripts)
    })
       .catch(err => console.log(err))
    }
}

scraper.process('https://nike.com');
