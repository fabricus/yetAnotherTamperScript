// ==UserScript==
// @name         Arbitrage bot - Dexeos script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  The arbitrage bot data extractor for Newdex
// @author       Us
// @match        https://dexeos.io/trade/*
// @grant        GM_xmlhttpRequest
// @require https://code.jquery.com/jquery-3.3.1.slim.min.js
// ==/UserScript==

var $ = window.jQuery;
var jQuery = window.jQuery;
var ticker = "";
var updating = false; // to avoid collision on some ongoing mutations to the DOM
var selector_bid = ".order-book-container > :nth-child(4) > :nth-child(1) > .ReactVirtualized__Table > .ReactVirtualized__Grid > .ReactVirtualized__Grid__innerScrollContainer > :nth-child(1)";
var selector_ask = ".order-book-container > :nth-child(2) > :nth-child(1) > .ReactVirtualized__Table > .ReactVirtualized__Grid > .ReactVirtualized__Grid__innerScrollContainer";
var best_ask = 0;
var ask_qty = 0;
var best_bid = 0;
var bid_qty = 0;

function sendWS(ask_price, ask_qty, bid_price, bid_qty, tick) {
    GM_xmlhttpRequest({
        method: "POST",
        url: "http://localhost:3000",
        data: "market=dexeos&ask_price=" + ask_price + "&ask_qty=" + ask_qty + "&bid_price=" + bid_price + "&bid_qty=" + bid_qty + "&ticker=" + tick,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function(response) {
            console.log(response.responseText);
        }
    });
}

async function domParser() {
    var nb_nodes = 1;
    try {
        nb_nodes = document.querySelector(selector_ask).childElementCount;
    } catch(err) {
        // the DOM probably isn't ready yet... we wait a bit and we try it again
        await sleep(3000);
        nb_nodes = document.querySelector(selector_ask).childElementCount;
    }
    var sel_ask = selector_ask + " > :nth-child(" + nb_nodes + ")";
    var tmp_best_ask = parseFloat(document.querySelector(sel_ask + " > .order-book-sell-text").textContent.replace(/\s/g,'').replace(',',''));
    var tmp_ask_qty = parseFloat(document.querySelector(sel_ask + " > .order-book-token").textContent.replace(/\s/g,'').replace(',',''));
    var tmp_best_bid = parseFloat(document.querySelector(selector_bid + " > .order-book-buy-text").textContent.replace(/\s/g,'').replace(',',''));
    var tmp_bid_qty = parseFloat(document.querySelector(selector_bid + " > .order-book-token").textContent.replace(/\s/g,'').replace(',',''));
    if ((tmp_best_ask != best_ask) && (tmp_ask_qty != ask_qty) && (tmp_best_bid != best_bid) && (tmp_bid_qty != bid_qty)) {
        // not a duplicate
        best_ask = tmp_best_ask;
        ask_qty = tmp_ask_qty;
        best_bid = tmp_best_bid;
        bid_qty = tmp_bid_qty;
        var d = new Date();
        console.log(d.toString() + " - best ask: " + best_ask.toString() + " (" + ask_qty.toString() + ") - best bid: " + best_bid.toString() + " (" + bid_qty.toString() + ")");
        sendWS(best_ask, ask_qty, best_bid, bid_qty, ticker);
    }
}

function onUpdate(mutations, observer) {
    updating = true;
    mutations.forEach(function(mutation) {
        domParser();
    });
    updating = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function get_data() {
    // First call (on page load) - we wait 10 seconds to make sure the orderbook is fully loaded
    await sleep(60000);

    ticker = document.querySelector(".order-book-container > :nth-child(2) > :nth-child(1) > .ReactVirtualized__Table > .ReactVirtualized__Table__headerRow > :nth-child(2) > .ReactVirtualized__Table__headerTruncatedText").textContent;
    console.log("Ticker: " + ticker);

    domParser();
    var a1 = new MutationObserver(onUpdate).observe( document.querySelector(".order-book-container") , { subtree: true, childList: true, characterData: true });

}

(function() {
    'use strict';

    get_data();

})();