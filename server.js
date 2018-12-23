import http from 'http'
import qs from 'querystring'
import log4js from 'log4js'

log4js.configure({
  appenders: { arbitrages: { type: 'file', filename: 'logs/arbitrages.log' } },
  categories: { default: { appenders: ['arbitrages'], level: 'trace' } }
});

var logger = log4js.getLogger('arbitrages'); // trace, debug, info, warn, error, fatal
const marketplaces = [ "newdex" , "dexeos" ];
var order_book = {};
var best_offers = {};
var arbitrage = false;
const json_book = { "markets" :
	{
      "newdex": {
	      "ask_price" : Number.MAX_VALUE,
	      "ask_qty": 0.0,
	      "bid_price": 0.0,
	      "bid_qty": 0.0
	  },
      "dexeos": {
      	  "ask_price" : Number.MAX_VALUE,
	      "ask_qty": 0.0,
	      "bid_price": 0.0,
	      "bid_qty": 0.0
      }
  }
};
const json_best_offer = {
		"arbitrage": false,
		"ask_price" : Number.MAX_VALUE,
	    "ask_qty": 0.0,
	    "bid_price": 0.0,
	    "bid_qty": 0.0,
	    "best_bid": "",
	    "best_ask": ""
	};

function init(post) {
	if (best_offers[post.ticker].ask_price == Number.MAX_VALUE) {
		logger.trace("First ask received for " + post.ticker);
		best_offers[post.ticker].ask_price = parseFloat(post.ask_price);
		best_offers[post.ticker].ask_qty = parseFloat(post.ask_qty);
		best_offers[post.ticker].best_ask = String(post.market);
	}

	if (best_offers[post.ticker].bid_price == 0) {
		logger.trace("First bid received for " + post.ticker);
		best_offers[post.ticker].bid_price = parseFloat(post.bid_price);
		best_offers[post.ticker].bid_qty = parseFloat(post.bid_qty);
		best_offers[post.ticker].best_bid = String(post.market);
	}
}

function process_data(post) {
	var doublon = false;

	if (!(post.ticker in order_book)) {
		logger.trace('Adding a new ticker: ' + post.ticker);
		order_book[post.ticker] = JSON.parse(JSON.stringify(json_book));
		best_offers[post.ticker] = JSON.parse(JSON.stringify(json_best_offer));
		init(post);
	}

	var ask_price = parseFloat(order_book[post.ticker].markets[post.market].ask_price);
	var ask_qty = parseFloat(order_book[post.ticker].markets[post.market].ask_qty);
	var bid_price = parseFloat(order_book[post.ticker].markets[post.market].bid_price);
	var bid_qty = parseFloat(order_book[post.ticker].markets[post.market].bid_qty);

	if ((ask_price == post.ask_price) && (ask_qty == post.ask_qty) && (bid_qty == post.bid_qty) && (bid_price == post.bid_price)) {
		logger.warn('Duplicate entry: ask => ' + ask_price + " qty => " + ask_qty + ", bid => " + bid_price + " qty => " + bid_qty);
		doublon = true;			
	} else {
		logger.debug("Ask price received: " + post.ask_price + " (" + post.ask_qty + "), current ask price: " + ask_price + " (" + ask_qty + ")");
		if (order_book[post.ticker].markets[post.market].ask_price < post.ask_price) {
			// ask is worsening
			if (best_offers[post.ticker].best_ask == post.market) {
				// the best ask is no longer relevant...
				var tmp_ask_price = parseFloat(post.ask_price);
				var tmp_ask_qty = parseFloat(post.ask_qty);
				var tmp_market = String(post.market);
				Object.keys(order_book[post.ticker].markets).forEach(function(market){
					if (market != post.market) {
						if (order_book[post.ticker].markets[market].ask_price < tmp_ask_price) {
							tmp_ask_price = parseFloat(order_book[post.ticker].markets[market].ask_price);
							tmp_ask_qty = parseFloat(order_book[post.ticker].markets[market].ask_qty);
							tmp_market = String(market);
						}
					}
				});
				// ... so we update the best ask accordingly
				best_offers[post.ticker].ask_price = tmp_ask_price;
				best_offers[post.ticker].ask_qty = tmp_ask_qty;
				best_offers[post.ticker].best_ask = tmp_market;
			} else {
				// best ask is still relevant
			}
		} else {
			// ask is improving
		}

		// we update the order book no matter if the ask is worsening or improving
		order_book[post.ticker].markets[post.market].ask_price = parseFloat(post.ask_price);
		order_book[post.ticker].markets[post.market].ask_qty = parseFloat(post.ask_qty);

		// if the ask we've received is better than the best ask we had then we update the best ask
		if (order_book[post.ticker].markets[post.market].ask_price < best_offers[post.ticker].ask_price) {
			// red section - sellers
			best_offers[post.ticker].ask_price = parseFloat(order_book[post.ticker].markets[post.market].ask_price);
			best_offers[post.ticker].ask_qty = parseFloat(order_book[post.ticker].markets[post.market].ask_qty);
			best_offers[post.ticker].best_ask = String(post.market);
		}
		
		logger.debug("Bid price received: " + post.bid_price + " (" + post.bid_qty + "), current bid price: " + bid_price + " (" + bid_qty + ")");
		if (order_book[post.ticker].markets[post.market].bid_price > post.bid_price) {
			// the bid is worsening
			if (best_offers[post.ticker].best_bid == post.market) {
				// the best bid is no longer relevant...
				var tmp_bid_price = parseFloat(post.bid_price);
				var tmp_bid_qty = parseFloat(post.bid_qty);
				var tmp_market = String(post.market);
				Object.keys(order_book[post.ticker].markets).forEach(function(market){
					if (market != post.market) {
						if (order_book[post.ticker].markets[market].bid_price > tmp_bid_price) {
							tmp_bid_price = parseFloat(order_book[post.ticker].markets[market].bid_price);
							tmp_bid_qty = parseFloat(order_book[post.ticker].markets[market].bid_qty);
							tmp_market = String(market);
						}
					}
				});
				// ... so we update the best bid accordingly
				best_offers[post.ticker].bid_price = tmp_bid_price;
				best_offers[post.ticker].bid_qty = tmp_bid_qty;
				best_offers[post.ticker].best_bid = tmp_market;
			} else {
				// best bid is still relevant
			}
		} else {
			// bid is improving
		}

		// we update the order book no matter if the ask is worsening or improving
		order_book[post.ticker].markets[post.market].bid_price = parseFloat(post.bid_price);
		order_book[post.ticker].markets[post.market].bid_qty = parseFloat(post.bid_qty);
		
		// if the bid we've received is better than the best bid we had then we update the best bid
		if (order_book[post.ticker].markets[post.market].bid_price > best_offers[post.ticker].bid_price) {
			// green section - buyers
			best_offers[post.ticker].bid_price = parseFloat(order_book[post.ticker].markets[post.market].bid_price);
			best_offers[post.ticker].bid_qty = parseFloat(order_book[post.ticker].markets[post.market].bid_qty);
			best_offers[post.ticker].best_bid = String(post.market);
		}

		// we check for an arbitrage
		if (best_offers[post.ticker].bid_price > best_offers[post.ticker].ask_price) {
			// ARBITRAGE :-)
			var qty = Math.min(best_offers[post.ticker].ask_qty, best_offers[post.ticker].bid_qty);
			var sell = qty*parseFloat(best_offers[post.ticker].ask_price);
			var buy = qty*parseFloat(best_offers[post.ticker].bid_price);
			var eos = buy - sell;
			var d = new Date();
			console.log(d.toString() + ": arbitrage for " + post.ticker + " buy @" + best_offers[post.ticker].ask_price + " (" + best_offers[post.ticker].ask_qty + " on " + best_offers[post.ticker].best_ask + "), sell @" + best_offers[post.ticker].bid_price + " (" + best_offers[post.ticker].bid_qty + " on " + best_offers[post.ticker].best_bid + ") - Qty: " + eos);
			best_offers[post.ticker].arbitrage = true;
			console.time("arbitrage-"+post.ticker);
		} else {
			if (best_offers[post.ticker].arbitrage) {
				console.timeEnd("arbitrage-"+post.ticker);
				best_offers[post.ticker].arbitrage = false;
			}
		}
		logger.debug(best_offers);
	}
}

const server = http.createServer( function(req, res) {

    if (req.method == 'POST') {
        var body = '';
        req.on('data', function (data) {
        	logger.trace('Data received: ' + data);
            body += data;
        });
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('OK');
        
        req.on('end', function () {
            var post = qs.parse(body);
            process_data(post);
        });
    }
    else
    {
    	// we don't process GET request in this app
        console.log("GET");
    }

});

function run() {
	var port = 3000;
	var host = '127.0.0.1';
	server.listen(port, host);
	console.log('Listening at http://' + host + ':' + port);
	logger.info('Listening at http://' + host + ':' + port);
}

run();