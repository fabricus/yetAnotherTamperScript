import { Api, JsonRpc, JsSignatureProvider } from "eosjs";
import ScatterJS from "scatterjs-core";
import ScatterEOS from "scatterjs-plugin-eosjs2"; // Use eosjs2 if your version of eosjs is > 16

// Using junglehistory here to get actions.  I tried the transaction with https://jungle2.cryptolions.io:443 and got the same error.
const endpoint = "http://junglehistory.cryptolions.io:18888"; // Jungle

const network = {
	blockchain: "eos",
	protocol: "https",
	host: "jungle2.cryptolions.io",
	port: 443,
	chainId: "e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473" // Jungle
};

	ScatterJS.plugins(new ScatterEOS());

		try {
			ScatterJS.scatter.connect(contractAccount).then(connected => {
				if (!connected) return console.log("Issue Connecting");

				const scatter = ScatterJS.scatter;

				requiredFields = {
					accounts: [network]
				};

				rpc = new JsonRpc(endpoint);
				window.ScatterJS = null;
			});
		} catch (error) {
			console.log(error);
		}

	login = cb => {
		try {
			scatter.getIdentity(requiredFields).then(() => {
				account = scatter.identity.accounts.find(
					x => x.blockchain === "eos"
				);

				eos = scatter.eos(network, Api, { rpc: rpc });
				return cb(account);
			});

			window.ScatterJS = null;
		} catch (error) {
			console.log(error);
		}
	};

	transaction = (action, data) => {
		return eos.transact(
			{
				actions: [
					{
						account: contractAccount,
						name: action,
						authorization: [
							{
								actor: account.name,
								permission: account.authority
							}
						],
						data: {
							...data
						}
					}
				]
			},
			{
				blocksBehind: 3,
				expireSeconds: 30
			}
		);
	};

	tokenTransfer = data => {
		return eos.transact(
			{
				actions: [
					{
						account: "eosio.token",
						name: "transfer",
						authorization: [
							{
								actor: account.name,
								permission: account.authority
							}
						],
						data: {
							from: account.name,
							to: data.to,
							quantity: data.quantity,
							memo: data.memo
						}
					}
				]
			},
			{
				blocksBehind: 3,
				expireSeconds: 30
			}
		);
	};