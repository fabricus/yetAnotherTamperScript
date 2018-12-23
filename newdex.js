// ==UserScript==
// @name         Arbitrage bot - Newdex script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  The arbitrage bot data extractor for Newdex
// @author       Us
// @match        https://newdex.io/trade/*
// @grant        GM_xmlhttpRequest
// @require https://code.jquery.com/jquery-3.3.1.slim.min.js
// ==/UserScript==

var $ = window.jQuery;
var jQuery = window.jQuery;
var ticker = "";
var updating = false; // to avoid collision on some ongoing mutations to the DOM
var selector = ".tcen-left > :nth-child(1) > .overflowbox";
var best_ask = 0;
var ask_qty = 0;
var best_bid = 0;
var bid_qty = 0;

function sendWS(ask_price, ask_qty, bid_price, bid_qty, tick) {
    GM_xmlhttpRequest({
        method: "POST",
        url: "http://localhost:3000",
        data: "market=newdex&ask_price=" + ask_price + "&ask_qty=" + ask_qty + "&bid_price=" + bid_price + "&bid_qty=" + bid_qty + "&ticker=" + tick,
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
        nb_nodes = document.querySelector(selector + " > :nth-child(1)").childElementCount;
    } catch(err) {
        // the DOM probably isn't ready yet... we wait a bit and we try it again
        await sleep(3000);
        nb_nodes = document.querySelector(selector + " > :nth-child(1)").childElementCount;
    }
    var tmp_best_ask = parseFloat(document.querySelector(selector + " > :nth-child(1) > :nth-child(" + nb_nodes + ") > :nth-child(1)").textContent.replace(/\s/g,'').replace('<!---->', ''));
    var tmp_ask_qty = parseFloat(document.querySelector(selector + " > :nth-child(1) > :nth-child(" + nb_nodes + ") > :nth-child(2)").textContent.replace(/\s/g,''));
    var tmp_best_bid = parseFloat(document.querySelector(selector + " > :nth-child(3) > :nth-child(1)").textContent.replace(/\s/g,'').replace('<!---->', ''));
    var tmp_bid_qty = parseFloat(document.querySelector(selector + " > :nth-child(3) > :nth-child(1) > :nth-child(2)").textContent.replace(/\s/g,''));
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

    ticker = document.querySelector(".head1 .fontb > .color-fff").textContent;
    console.log("Ticker: " + ticker);
    domParser();
    var a1 = new MutationObserver(onUpdate).observe( document.querySelector(selector) , { subtree: true, childList: true, characterData: true });
}

(function() {
    'use strict';

    get_data();

})();