window._ = require('lodash');
window.Popper = require('popper.js').default;
/**
 * We'll load jQuery and the Bootstrap jQuery plugin which provides support
 * for JavaScript based Bootstrap features such as modals and tabs. This
 * code may be modified to fit the specific needs of your application.
 */

try {
    window.$ = window.jQuery = require('jquery');
    require('bootstrap');
    window.Web3 = require('web3');
    window.TruffleContract = require('truffle-contract');
} catch (e) {}

/**
 * App scripts
 */
App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',

    init: function() {
        return App.initWeb3();
    },

    initWeb3: function() {
        if (typeof web3 !== 'undefined') {
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
            web3 = new Web3(App.web3Provider);
        }
        return App.initContract();
    },

    initContract: function() {
        $.getJSON('Election.json', function(election) {
            App.contracts.Election = TruffleContract(election);
            App.contracts.Election.setProvider(App.web3Provider);
            if (typeof App.contracts.Election.currentProvider.sendAsync !== 'function') {
                App.contracts.Election.currentProvider.sendAsync = function() {
                    return App.contracts.Election.currentProvider.send.apply(App.contracts.Election.currentProvider, arguments);
                };
            }
            App.listenForEvents();
            
            return App.render();
        });
    },

    render: function() {
        var electionInstance;
        var loader = $('#loader');
        var content = $('#content');

        loader.show();
        content.hide();

        web3.eth.getCoinbase(function(err, account) {
            if (err == null) {
                App.account = account;
                $('#accountAddress').html("Your account: " + account);
            }
        });

        App.contracts.Election.deployed().then(function(instance) {
            electionInstance = instance;
            return electionInstance.candidatesCount();
        }).then(function(candidatesCount) {
            var candidatesResults = $('#candidatesResults');
            candidatesResults.empty();

            var candidatesSelect = $('#candidatesSelect');
            candidatesSelect.empty();

            for (let i = 1; i <= candidatesCount; i++) {
                electionInstance.candidates(i).then(function(candidate) {
                    var candidateTemplate = `<tr><th>${candidate[0]}</th><td>${candidate[1]}</td><td>${candidate[2]}</td></tr>`;
                    candidatesResults.append(candidateTemplate);

                    var candidateOption = `<option value='${candidate[0]}'>${candidate[1]}</ option>`;
                    candidatesSelect.append(candidateOption);
                });
            }
            return electionInstance.voters(App.account);
        }).then(function(hasVoted) {
            // Do not allow a user to vote
            if(hasVoted) {
                $('form').hide();
            }
            loader.hide();
            content.show();
        }).catch(function(err) {
            console.warn(err);
        });
    },

    castVote: function() {
        var candidateId = $('#candidatesSelect').val();
        App.contracts.Election.deployed().then(function(instance) {
          return instance.vote(candidateId, { from: App.account });
        }).then(function(result) {
          // Wait for votes to update
          $("#content").hide();
          $("#loader").show();
        }).catch(function(err) {
          console.error(err);
        });
    },

    listenForEvents: function() {
        App.contracts.Election.deployed().then(function(instance) {
          instance.votedEvent({}, {
            fromBlock: 0,
            toBlock: 'latest'
          }).watch(function(error, event) {
            console.log("event triggered", event)
            // Reload when a new vote is recorded
            App.render();
          });
        });
    }
};

(function() {
    $(window).on('load', function() {
        App.init();
    });
})();