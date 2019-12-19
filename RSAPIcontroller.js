const proxyurl = "https://sheltered-dawn-97733.herokuapp.com/"; // to bypass CORS
const DIVINE_CHARGE_ITEM_ID = 36390;
const EMPTY_DIVINE_CHARGE_ITEM_ID = 41073;
const WOODCUTTING_CATEGORY_INDEX = 36;
const defaultItemsInTable = [ //hard coded values referenced from (https://runescape.fandom.com/wiki/Calculator:Disassembly_by_category/logs)
    { name: 'maple logs',   id: 1517, chanceForJunk: 41.9}, 
    { name: 'yew logs',     id: 1515, chanceForJunk: 28.2}, 
    { name: 'willow logs',  id: 1519, chanceForJunk: 55.6}, 
    { name: 'teak',         id: 6333, chanceForJunk: 51}, 
    { name: 'logs',         id: 1511, chanceForJunk: 82}
];

const  rsAPI = new RSAPI;

const fetchData = async (RESTcall) => {
    const response = await fetch(RESTcall);
    return response;
}

let fetchDataByItemId = async (itemId) => {
    let request = rsAPI.itemDetail_requestFactory(itemId); 
    let response = await fetchData(proxyurl + request);
    let info = await response.json();
    let price = info.item.current.price;
    return castToNumericFormat(price);
}

var DIVINE_CHARGE_PRICE;
var EMPTY_CHARGE_PRICE;

var promise1 = fetchDataByItemId(DIVINE_CHARGE_ITEM_ID).then(data => {
    DIVINE_CHARGE_PRICE = data; 
});
var promise2 = fetchDataByItemId(EMPTY_DIVINE_CHARGE_ITEM_ID).then(data => {
    EMPTY_CHARGE_PRICE = data; 
});

//main loop

//Dissassembler profit logic
Promise.all([promise1, promise2]).then(() => {
    let unsortedData = []
    for( item of rsAPI.itemsInTable){
        let request = rsAPI.requestFactory(WOODCUTTING_CATEGORY_INDEX, item.name);
        createDissassembleTableEntry(request).then(data => {
            unsortedData.push([data[0], data[1]]);
            if (rsAPI.itemsInTable.length === unsortedData.length){
                printDataToHTML(unsortedData);
            }
        });
    }   
});

//TODO? perhaps create a farming chart for most profitable herbs?

///////////

function printDataToHTML(unsortedData){
    let sortedData = unsortedData.sort((a, b) => b[0] - a[0]);
    for(row of sortedData){
        $('#DissassembleTable').append(addRowInHTML(row[1]));
    }
}

function createDissassembleTableEntry(API_request) {
    return fetchData(proxyurl + API_request).then(data => {
        return data.json().then(data => {
            let info = data.items[0];
            let profit = getWeeklyDissassemblyProfit(info);
            let columnData = "";
            columnData += addColumnInHTML(addImageInHTML(info.icon))
                + addColumnInHTML(info.name)
                + addColumnInHTML(info.current.price)
                + addColumnInHTML(getPerctentChanceOfSimplePart(info.id))
                + addColumnInHTML(profit.toLocaleString(undefined, {maximumFractionDigits:2}));
            return [profit, columnData];
        })
    });
}


function addColumnInHTML(data){
    return "<div class=\"col text-center\">" + data + "</div>";
}

function addImageInHTML(href){
    return "<img src=\"" + href + "\">";
}

function addRowInHTML(columns) {
    return "<div class=\"row\"> " + columns + "</div>";
}

function RSAPI (){
    this.base_URL = 'http://services.runescape.com/m=itemdb_rs/api/catalogue/items.json?', //category=36&alpha=maple log&page=1'
    this.baseDetail_URL = 'http://services.runescape.com/m=itemdb_rs/api/catalogue/detail.json?', //item={itemId}
    this.requestFactory = (category, string_search) => {
        return this.base_URL + "category=" + category + "&alpha=" + string_search + "&page=1";
    }
    this.itemDetail_requestFactory = (itemId) => {
        return this.baseDetail_URL + "item=" + itemId;
    }
    this.itemsInTable = defaultItemsInTable;
    this.chanceForSimplePartMap = getOddsForSimplePartForItemIDs(this.itemsInTable);
}

function getPerctentChanceOfSimplePart(id){
    let percent = rsAPI.chanceForSimplePartMap.get(id) * 100;
    percent = Math.round(percent)/100;
    return "%" + percent;
}

function getOddsForSimplePartForItemIDs(items){
    let map = new Map();
    for (item of items){
        let itemID = item.id;
        let chanceForSimplePartOnDissassemble = ((100 - item.chanceForJunk) * .99);
        map.set(itemID, chanceForSimplePartOnDissassemble);
    }
    return map;
}

function castToNumericFormat(stringNumber){
    if(stringNumber.toLowerCase().includes('k')){
        return stringNumber.substring(0, stringNumber.length-1)*1000; // replacing K with 1,000s
    } else if (stringNumber.toLowerCase().includes('m')) {
        return stringNumber.substring(0, stringNumber.length-1)*1000000; //replacing M with 1,000,000s
    } else {
        return stringNumber; //already numeric
    }
}

function getWeeklyDissassemblyProfit(itemInfo){
    const weeklyDissassembleRate = 10080; //this is for the MK II dissassembler (requires 81 invention)
    const simplePartCostPerEmptyDivineCharge = 20;
    const chargesConsumedPerWeek = 13;
    let simplePartRate = rsAPI.chanceForSimplePartMap.get(itemInfo.id);
    let simplePartsPerWeek = weeklyDissassembleRate * (simplePartRate/100);
    let emptyDivineChargesPerWeek = simplePartsPerWeek / simplePartCostPerEmptyDivineCharge;

    let grossIncome = emptyDivineChargesPerWeek * EMPTY_CHARGE_PRICE;
    let expenses = (chargesConsumedPerWeek * DIVINE_CHARGE_PRICE) + (weeklyDissassembleRate * itemInfo.current.price);

    let weeklyProfit = grossIncome - expenses;
    return weeklyProfit;
}





