//developed by rockscripts

window.$ = window.jQuery  = require( 'jquery' );
require('jquery-ui-bundle');
var cjs = require('candlejs');
var mysql = require('mysql');
var DBPool = mysql.createPool(
{
  host: "localhost",
  user: "root",
  password: "",
  database: "oanda",
  port: "3306",
  acquireTimeout:90000,
  waitForConnections:true
});

var Noty              = require('noty');
var dt                = require('datatables.net-responsive')( window, jQuery );
var Oanda             = require('node-oanda');
var serialize         = require('dom-form-serializer').serialize
var currencyFormatter = require('currency-formatter');
var CronJob           = require('cron').CronJob;
var Dygraph           = require('dygraphs');
const remote          = window.require('electron').remote;
var   configv2        = remote.getGlobal('configurationV2').conf;
var fs                = require('fs');
var csv               = require('fast-csv');
var   api             = new Oanda(configv2); 
/*added to replace trade or edit
  node oanda does not work
*/
var OANDAAdapter = require('oanda-adapter-v20');

var client = new OANDAAdapter({
    // 'live', 'practice' or 'sandbox'
    environment: 'practice',
    // Generate your API access in the 'Manage API Access' section of 'My Account' on OANDA's website
    accessToken: configv2.token,    
});

/*DATA TABLES*/
var tableGlobalConf = jQuery("#tableGlobalConf");

/*ACCOUNTS CODE*/
var request = api.accounts.getAccountsForUser();
var dataSet = [];
// Here we handle a successful response from the server



request.success(function(data) { 

     var accountsList = data.accounts;
     var index = 0; 
     var tmpObject = Object.keys(accountsList);
     if(tmpObject.length==0)
       {var table = jQuery('#tableTrading').dataTable({data:dataSet});}
     Object.keys(accountsList).forEach(function(key) {
        var accountLine = accountsList[key];        
        //jQuery("#accountsList").html(accountLine.id);
        var requestAccountDetails = api.accounts.getAccountInformation(accountLine.id);
        
        requestAccountDetails.success(function(dataAccount) 
        {              
            var accountDetails = dataAccount.account;   
            var row = [accountDetails.id,accountDetails.alias,currencyFormatter.format(accountDetails.balance, { code: accountDetails.currency }),"<img src='../assets/images/exchange.png' class='icons open-trading' id='"+accountDetails.id+"' />"+"&nbsp&nbsp<img src='../assets/images/transaction.png' class='icons open-transactions' id='"+accountDetails.id+"' />"]; ;
            dataSet[index] = row;
            
            if(index == tmpObject.length-1)
            var table = jQuery('#tableAccounts').dataTable({data:dataSet});
            index++;    
        });
        requestAccountDetails.error(function(err) {           
          console.log('ERROR[ACCOUNT DETAILS]: ', err);
        });
        requestAccountDetails.go();
    });    
});

request.error(function(err) { 
  console.log('ERROR[ACCOUNTS LIST]: ', err);
}); 

request.go();
  

var tradingMain  = jQuery("#traddingMain");
var accountsList  = jQuery("#accountsList");
var tradeConfiguration = jQuery("#tradeConfiguration");
var chartCandles = jQuery("#instrumentChartMain");
var buttonAddBuyConf = jQuery(".addBuyRowGlobal");
var buttonEditGlobalConf = jQuery(".editGlobalConf");
var dataTableTrades = jQuery('#tableTrading');
jQuery("body").css("display","inline");
tradingMain.fadeOut();


jQuery(document).on("click",".open-trading",function(e)
{    
setAccountId = function (selector) {
  var accountID = selector.attr("id");
  jQuery("#accountId").val(accountID);
  return accountID;
};
var accountID = setAccountId($(this));

/*setGlobalConfAccount(accountID,{enabled:0},function(err,result)
    {
      if(result.affectedRows>0)
      {
        displayNotification("info","Configurations for instruments has been disabled.")  
      }
    }) ; */
accountsList.fadeOut( "fast", function() {
tradingMain.fadeIn("slow");


var requestTrades = api.trades.getListOfOpenTrades(accountID/*,{instrument: "EUR_USD"}*/);
requestTrades.success(function(dataTrades) 
{
  var dataSet = [];
  var tradesList = dataTrades.trades;
  var index = 0; 
  var tmpObject = Object.keys(tradesList);
  if(tmpObject.length==0)
  {
    dataTableTrades.DataTable().destroy();
    dataTableTrades.dataTable({data:dataSet});
  }
  Object.keys(tradesList).forEach(function(key) 
  {
    var tradeLine = tradesList[key];
    var row = [tradeLine.id,tradeLine.instrument,tradeLine.currentUnits,tradeLine.price,"<span class='current-price-"+tradeLine.instrument+"' trade-unit='"+tradeLine.currentUnits+"' trade-price='"+tradeLine.price+"' index='"+index+"' trade-id='"+tradeLine.id+"'></span>","<span class='trade-profit-"+index+"'></span>",timeConverter(tradeLine.openTime),"<img src='../assets/images/analytics.png' instrument='"+tradeLine.instrument+"' class='icons open-graph' id='"+tradeLine.id+"' title='Open Graph for "+tradeLine.instrument+"' />"]; ;
    
    dataSet[index] = row;
      
    if(index == tmpObject.length-1) 
    { 
      if ( ! $.fn.DataTable.isDataTable( '#tableTrading' ) ) {
        dataTableTrades.dataTable({data:dataSet});
      }   
      else
      {
        dataTableTrades.DataTable().destroy();
        dataTableTrades.dataTable({data:dataSet});
      }       
    }
   
    index++;
  });
  updateLiveData();
});
requestTrades.go();
});    
});


jQuery(document).on("click",".open-graph",function()
{
  var accountID = jQuery("#accountId").val();   
  var instrument = jQuery(this).attr("instrument");   
  displayGraphicConf(instrument,accountID,function(){});  
});

jQuery(document).on("click",".open-transactions",function()
{   
  var accountID = jQuery(this).attr("id") ;
  fillTableTransactions(accountID);
  jQuery(".transactions-container").dialog({
    modal: true,
    resizable: false,
    title: 'Transactions',
    open: function(){
                      jQuery('.ui-dialog').css({
                                                'width': $(window).width(),
                                                'height': $(window).height(),
                                                'left': '0px',
                                                'top':'0px',
                                                'position':'absolute'
                                              });
                                              jQuery(".transactions-container").fadeIn();
                     
                    },
    close: function()
    {
      jQuery(".transactions-container").fadeOut();     
    }
 }); 
});

jQuery(document).on("click",".goBackAccounts",function(){   
tradingMain.fadeOut( "slow", function() {
  jQuery("#tradeConfiguration").fadeIn();
accountsList.fadeIn();
jQuery("#goGlobalConfiguration").fadeIn();
tradeConfiguration.hide();

})
});

//goGlobalConfiguration

jQuery(document).on("click",".goGlobalConfiguration",function()
{ 
  var accountID = jQuery("#accountId").val();
  jQuery(".form-accountId").val(accountID);
  tradeConfiguration.dialog({
    modal: true,
    resizable: false,
    title: ' Add BUY configuration',
    open: function(){
      jQuery('.ui-dialog').css({
                                'width': $(window).width(),
                                'height': $(window).height(),
                                'left': '0px',
                                'top':'0px'
                              });
      jQuery("#goGlobalConfiguration").fadeOut();
      jQuery("#tradesList").fadeOut();
      buttonAddBuyConf.fadeIn();
                    },
    close: function(){
      jQuery(".goGlobalConfiguration").fadeIn();
      jQuery("#tradesList").fadeIn();
    }
 }); 
 jQuery("#addGlobalConfigurationBUYoportunity").addClass("hide");
 tradeConfiguration.dialog("open");
 fillTableGlobalConf();
});
jQuery(document).on("click",".addBuyRowGlobal",function()
{ 
  var instrumentsDropdown = jQuery("#instrumetns-dropdown");
  var accoundId = jQuery("#accountId").val();
  client.getInstrumentsList(accoundId,function(error, instruments){
   
  Object.keys(instruments).forEach(function(key) 
      {
        var instrumentLine = instruments[key];
        instrumentsDropdown.append(jQuery("<option />").val(instrumentLine.name).text(instrumentLine.displayName));                  
      });
      jQuery("#addGlobalConfigurationBUYoportunity").attr("action","add");
      //jQuery("#instrumetns-dropdown").attr("disabled",false);
      jQuery("#instrumetns-dropdown").val("EUR_USD");
      jQuery("#minPrice").val("");
      jQuery("#maxPrice").val("");
      jQuery("#takeProfit").val("");
      jQuery("#stopLoss").val("");
      jQuery("#maxUnits").val("");
      jQuery("#enabled").val(1);
      jQuery("#submit-global-conf").val("Submit");
      jQuery("#addGlobalConfigurationBUYoportunity").removeClass("hide");
      jQuery(".addBuyRowGlobal").fadeOut("fast");   
      }); 
});

jQuery(document).on("click",".editGlobalConf",function()
{ 
  var instrumentsDropdown = jQuery("#instrumetns-dropdown");
  var accoundId = jQuery("#accountId").val();
  var confId = jQuery(this).attr("id");
  client.getInstrumentsList(accoundId,function(error, instruments){
  
      jQuery("#addGlobalConfigurationBUYoportunity").removeClass("hide");
      jQuery(".addBuyRowGlobal").fadeOut("fast"); 
      jQuery(".add-element").fadeOut("fast"); 
      jQuery(".edit-element").removeClass("hide");  
      jQuery("#addGlobalConfigurationBUYoportunity").attr("action","edit");
      jQuery("#addGlobalConfigurationBUYoportunity").attr("confId",confId);

     getGlobalConfById(confId,function(rowConf)
      {
        jQuery("#instrumetns-dropdown").find('option').remove();
        //jQuery("#instrumetns-dropdown").attr("disabled",true);
        Object.keys(instruments).forEach(function(key) 
          {
            var instrumentLine = instruments[key];
            if(rowConf.instrument == instrumentLine.name)
            {
              instrumentsDropdown.append(jQuery("<option />").val(instrumentLine.name).text(instrumentLine.displayName));
            }                              
          });

        jQuery("#instrumetns-dropdown").val(rowConf.instrument);
        jQuery("#minPrice").val(rowConf.minPrice);
        jQuery("#maxPrice").val(rowConf.maxPrice);
        jQuery("#takeProfit").val(rowConf.takeProfit);
        jQuery("#stopLoss").val(rowConf.stopLoss);
        jQuery("#sMinPrice").val(rowConf.sMinPrice);
        jQuery("#sMaxPrice").val(rowConf.sMaxPrice);
        jQuery("#maxUnits").val(rowConf.maxUnits);
        jQuery("#enabled").val(rowConf.enabled);
        jQuery("#submit-global-conf").val("Save");
      });
      
    }); 
});

jQuery(document).on("click",".closeForm-addGlobalConfigurationBUYoportunity",function()
{
  jQuery("#addGlobalConfigurationBUYoportunity").addClass("hide",function(){  buttonAddBuyConf.fadeIn(); });    
  if(jQuery("#addGlobalConfigurationBUYoportunity").attr("action")=="edit")
  {
    jQuery(".add-element").fadeIn("fast"); 
    jQuery(".edit-element").addClass("hide"); 
  }
});
jQuery(document).on("click",".updateTradesTable",function()
{
  updateDataTableTrades();
});
jQuery( "#addGlobalConfigurationBUYoportunity" ).submit(function( event ) 
{
  event.preventDefault();
  var object = serialize(document.querySelector('#addGlobalConfigurationBUYoportunity'));  
  var action = jQuery(this).attr("action");
  if(action=="add")
  {
    DBPool.getConnection(function(err, connection) 
    {
      
      connection.query('INSERT INTO globalConfiguration SET ?', object, function (error, results, fields) 
        {
          connection.release();
          if (error) throw error;
  
          if(results.insertId > 0)
          {
            jQuery("#addGlobalConfigurationBUYoportunity").addClass("hide",function(){  buttonAddBuyConf.fadeIn(); });          
            displayNotification("success",'Configuration saved');   
            fillTableGlobalConf();   
          } 
        });  
    });
  }
  if(action=="edit")
  {
    console.log(object)
    var confId = jQuery(this).attr("confId");
    setGlobalConf(confId,object,function(err,result)
    {
      if(result.affectedRows>0)
      {
        fillTableGlobalConf();  
        displayNotification("success","Configuration saved.");
        jQuery("#addGlobalConfigurationBUYoportunity").addClass("hide",function(){  buttonAddBuyConf.fadeIn(); });  
        jQuery(".add-element").fadeIn("fast"); 
        jQuery(".edit-element").addClass("hide");   
      }
    }) ;     
  }
  
});

function fillTableGlobalConf()
{
  tableGlobalConf.DataTable().destroy();
  var accountID = jQuery("#accountId").val();  
  var dataSet = [];    
  DBPool.getConnection(function(err, connection) 
  {  
    connection.query("SELECT * FROM globalConfiguration WHERE accountId='"+accountID+"'", function (error, results, fields) 
  {
    connection.release();
    if (error) throw error;
    var index = 0; 
    var iconStatus = null;
    results.forEach(function(confRow) 
    {

      if(confRow.enabled=="0")
      iconStatus = "<img src='../assets/images/switch-off.png' class='icons' title='This configuration is disabled' />";
      else
      var iconStatus = "<img src='../assets/images/switch-on.png' class='icons' title='This configuration is enabled' />";

      var row = [confRow.id,confRow.instrument,confRow.minPrice,confRow.maxPrice,confRow.sMinPrice,confRow.sMaxPrice,confRow.takeProfit,confRow.stopLoss,confRow.maxUnits,iconStatus,"<img src='../assets/images/pen.png' class='icons-small editGlobalConf' id='"+confRow.id+"'/>"+"&nbsp;&nbsp;<img src='../assets/images/analytics.png' class='icons-small open-graph' instrument='"+confRow.instrument+"'/>"];
      dataSet[index] = row;
      index++;
    });
    tableGlobalConf.dataTable({data:dataSet});
    
  });
});
}
function fillTableTransactions(accountID)
{
  jQuery("#tableTransactions").DataTable().destroy();
  var accountID = accountID;  
  var dataSet = [];    
  DBPool.getConnection(function(err, connection) 
  {  
    connection.query("SELECT * FROM transactionPL WHERE accountID='"+accountID+"'", function (error, results, fields) 
  {
    connection.release();
    if (error) throw error;
    var index = 0; 
    results.forEach(function(transaction) 
    {
      var pl = transaction.pl;
      if(transaction.reason=="TAKE_PROFIT_ORDER")
           pl = "<span class='profits'>"+pl+"</span>";
      else
           pl = "<span class='losses'>"+pl+"</span>";

      var time = transaction.time;
      var dateTimeParts = time.split("T");
      var niceDate = dateTimeParts[0];
      var timePart = dateTimeParts[1];
      timePart = timePart.split(".")
      var niceTime = timePart[0];
      var row = [transaction.orderID,transaction.instrument,transaction.units,pl,niceDate+" at "+niceTime];
      dataSet[index] = row;
      index++;
    });
    jQuery("#tableTransactions").dataTable({data:dataSet});
    
  });
});
}
function updateLiveData()
{
  var accountId = jQuery("#accountId").val();
  var instruments = ["XAU_USD","XAG_USD"] ;
  new CronJob('* * * * * *', function() 
  {
    
  client.getPrice(instruments, accountId, function(error, ratesprices)
  {
    Object.keys(ratesprices).forEach(function(key) 
      {
        var rateLine = ratesprices[key];       
        {
          jQuery(".current-price-"+rateLine.instrument).html(rateLine.bids[0].price);//update current price
          jQuery(".current-price-"+rateLine.instrument).each(function( index ) 
          {
            console.log(rateLine)
           var currentPrice = rateLine.bids[0].price;
           var tradeUnit = jQuery(this).attr("trade-unit");
           var tradePrice = jQuery(this).attr("trade-price");
           var tradeId = jQuery(this).attr("trade-id");
           var currentIndex = jQuery(this).attr("index");
           //var openingRate = mid.o;
           //var closingRate = mid.c;//candles
           openingRate = rateLine.closeoutBid;
           closingRate = rateLine.closeoutAsk;
           var profit = (parseFloat(currentPrice) - parseFloat(tradePrice)) * parseFloat(tradeUnit);
           var nowDateTime = new Date();
           nowDateTime = formatDate(nowDateTime, "dddd h:mmtt d MMM yyyy");

           var base_currency = rateLine.instrument.split("_");
           base_currency = base_currency[0];
           jQuery(".trade-profit-"+currentIndex).text(currencyFormatter.format(profit, { code: base_currency }));

           getGlobalConf("BUY",rateLine.instrument,function(globalConf)
           {
             //Take profit based on instrument configuration
            /*  if(globalConf!=null)
              {
                /*BEGIN TAKE PROFIT*/
              /*  if(rateLine.instrument=="XAU_USD")
                var takeProfitPrice = sumeFloat(currentPrice,0.010);
                else
                var takeProfitPrice = sumeFloat(currentPrice,0.00008);

                if(profit > globalConf.takeProfit)
                {
                  if(globalConf.alreadyInvested == 1)
                  {
                    if(globalConf.enabled)
                    {
                      takeProfit(tradeId, takeProfitPrice, globalConf.id);
                    }
                    //require above current price   
                    //sendNotification("Take Profit Requested","Trade ID: "+tradeId +"\n"+"Taked at: "+takeProfitPrice+"\n"+"Date: "+nowDateTime);                          
                //    displayNotification("success","taked profit "+tradeId)
                  }                            
                } 

                /*END TAKE PROFIT*/
                //Stop loss based on instrument configuration     
                 /*BEGIN STOP LOSS*/
               /* if(rateLine.instrument=="XAU_USD")
                var stopLossPrice = restFloat(currentPrice,0.010);
                else
                var stopLossPrice = restFloat(currentPrice,0.00008);
                
                if(profit < (globalConf.stopLoss*(-1)))
                {
                  if(globalConf.alreadyInvested == 1)
                  {
                    if(globalConf.enabled)
                    {
                    stopLoss(tradeId, stopLossPrice, globalConf.id);
                    }
                  }                            
                }
              } 
              */
               /*IS TIME TO AUTO INVEST?*/
              /* if(globalConf!=null)
               {
                 if(parseFloat(currentPrice) > parseFloat(globalConf.minPrice) && parseFloat(currentPrice) < parseFloat(globalConf.maxPrice))                  
                 {
                   if(globalConf.enabled == 1)
                   {
                     if(globalConf.alreadyInvested == 0)
                     {   
                      //buy                                            
                      createTrade(globalConf.instrument, globalConf.maxUnits, globalConf.id);
                     }
                   }
                 }  

                 if(parseFloat(currentPrice) > parseFloat(globalConf.sMinPrice) && parseFloat(currentPrice) < parseFloat(globalConf.sMaxPrice))                  
                 {
                   if(globalConf.enabled == 1)
                   {
                     if(globalConf.alreadyInvested == 0)
                     {   
                      //sell                                            
                      createTrade(globalConf.instrument, globalConf.maxUnits * (-1), globalConf.id);
                     }
                   }
                 }  
               }  */  
           });                     
            
          });
        }
      });
  });
  }, null, true, 'America/Bogota');
}

function updateDataTableTrades()
{
var accountID = jQuery("#accountId").val();
var requestTrades = api.trades.getListOfOpenTrades(accountID);
requestTrades.success(function(dataTrades) 
{
  var dataSet = [];
  var tradesList = dataTrades.trades;
  var index = 0; 
  var tmpObject = Object.keys(tradesList);
  if(tmpObject.length==0)
  {
    dataTableTrades.DataTable().destroy();
    dataTableTrades.dataTable({data:dataSet});
  }
  Object.keys(tradesList).forEach(function(key) 
  {
    var tradeLine = tradesList[key];
    var row = [tradeLine.id,tradeLine.instrument,tradeLine.currentUnits,tradeLine.price,"<span class='current-price-"+tradeLine.instrument+"' trade-unit='"+tradeLine.currentUnits+"' trade-price='"+tradeLine.price+"' index='"+index+"' trade-id='"+tradeLine.id+"'></span>","<span class='trade-profit-"+index+"'></span>",timeConverter(tradeLine.openTime),"<img src='../assets/images/settings-row.png' class='icons' id='"+tradeLine.id+"' title='Configure this trade' />"]; ;
    
    dataSet[index] = row;
      
    if(index == tmpObject.length-1) 
    { 
      if ( ! $.fn.DataTable.isDataTable( '#tableTrading' ) ) {
        dataTableTrades.dataTable({data:dataSet});
      }   
      else{
        dataTableTrades.DataTable().destroy();
        dataTableTrades.dataTable({data:dataSet});
      }
       
    }
   
    index++;
  });
  updateLiveData();
});
requestTrades.go(); 
}
function createTrade(instrument, units, confId)
{
  var accountID = jQuery("#accountId").val(); 
  if(jQuery(".current-price-"+instrument).length==0)
  {
    setGlobalConf(confId,{alreadyInvested:1},function(err, result)
    {
      if(result.affectedRows>0)
      {
        client.createOrder(accountID,{"order":{"units":units, "instrument": instrument, "timeInForce":"FOK", "type": "MARKET", "positionFill": "DEFAULT"}},function(result)
        {
            //displayNotification("success","# Create trade was requested 1");
            displayNotification("success","# Create trade was requested");
            updateDataTableTrades();       
        });
      }
    }); 
  }    
}

function takeProfit(tradeId, currentPrice, confId)
{
  var accountId = jQuery("#accountId").val();
  console.log({"takeProfit":{"price":currentPrice,"timeInForce": "GTC",}})
  setGlobalConf(confId,{alreadyInvested:0},function(err, result)
  {
    if(result.affectedRows>0)
    {
      client.replaceTrade(accountId,tradeId,{"takeProfit":{"price":currentPrice,"timeInForce": "GTC",}},function(data)
      {
        displayNotification("success","#"+tradeId+" Take Profit was requested.");
        updateDataTableTrades();
      });
    }  
  });
}

function stopLoss(tradeId, currentPrice, confId)
{
  var accountId = jQuery("#accountId").val();
  setGlobalConf(confId,{alreadyInvested:0},function(err, result)
  {
    if(result.affectedRows>0)
    {
      client.replaceTrade(accountId,tradeId,{"stopLoss":{"price":currentPrice,"timeInForce": "GTC",}},function(data)
      {
        displayNotification("success","#"+tradeId+" Stop Loss was requested.");
        updateDataTableTrades();
      });
    }  
  });
}

function getGlobalConf(type,instrument,callback)
{
  var accountID = jQuery("#accountId").val();   
  DBPool.getConnection(function(err, connection) 
  {
    connection.query("SELECT * FROM globalConfiguration WHERE accountId='"+accountID+"' AND type='"+type+"' AND instrument='"+instrument+"'", function (error, results, fields) 
      {        
        connection.release();
        if(error==null)
        {             
            return callback(results[0]);       
        }      
        else
        {          
          return callback(null);
        }     
      });
  });
}
function getGlobalConfById(id,callback)
{
  var accountID = jQuery("#accountId").val();   
  DBPool.getConnection(function(err, connection) 
  {    
    connection.query("SELECT * FROM globalConfiguration WHERE id='"+id+"'", function (error, results, fields) 
      {
        connection.release();
        if(error==null)
        {             
            return callback(results[0]);       
        }      
        else
        {          
          return callback(null);
        }     
      });
  });
}
function setGlobalConf(id,updateData, callback)
{    
  DBPool.getConnection(function(err, connection) 
  {
    connection.query('UPDATE globalConfiguration SET ? WHERE ?', [updateData, { id: id }], function (error, results) 
    {
      connection.release(); 
      return callback(error, results)
    })
  });
}
function setGlobalConfAccount(accountId,updateData, callback)
{    
  DBPool.getConnection(function(err, connection) 
  {
    connection.query('UPDATE globalConfiguration SET ? WHERE ?', [updateData, { accountId: accountId }], function (error, results) 
    {
      connection.release(); 
      return callback(error, results)
    })
  });
}
function getAccountTransactions(account,callback)
{  
  DBPool.getConnection(function(err, connection) 
  {    
    connection.query("SELECT * FROM transactionPL WHERE accountID='"+account+"'", function (error, results, fields) 
      {
        connection.release();
        if(error==null)
        {             
            return callback(results);       
        }      
        else
        {          
          return callback(null);
        }     
      });
  });
}

function displayNotification(type,msn)
{
  //alert, success, warning, error, info/information
  new Noty({
    text: msn,
    type: type,
    layout: 'topRight',
    theme: 'relax'
  }).show();
}

function sumeFloat(a,b)
{
  return (parseFloat(a) + parseFloat(b)).toFixed(5);
}
function restFloat(a,b)
{
  return (parseFloat(a) + parseFloat(b)).toFixed(5);
}
//@format 11/5/2018 15:59:45
function timeConverter(UNIX_timestamp){
var a = new Date(UNIX_timestamp * 1000);
var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var year = a.getFullYear();
var month = a.getMonth()+1
var date = a.getDate();
var hour = a.getHours();
var min = a.getMinutes();
var sec = a.getSeconds();
var time = date + '/' + month + '/' + year + ' ' + hour + ':' + min + ':' + sec ;
return time;
}

function sendNotification(subject,message)
{
  var email 	= require("emailjs");
var server 	= email.server.connect({
   user:    "", 
   password:"", 
   host:    "smtp.gmail.com", 
   ssl:     true
});

// send the message and get a callback with an error or details of the message that was sent
server.send({
   text:    message, 
   from:    "you <rockscripts@gmail.com>", 
   to:      "someone <wsalexws@gmail.com>",
   subject: subject
}, function(err, message) { console.log(err || message); });
}

function formatDate(date, format, utc) {
  var MMMM = ["\x00", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MMM = ["\x01", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var dddd = ["\x02", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var ddd = ["\x03", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function ii(i, len) {
      var s = i + "";
      len = len || 2;
      while (s.length < len) s = "0" + s;
      return s;
  }

  var y = utc ? date.getUTCFullYear() : date.getFullYear();
  format = format.replace(/(^|[^\\])yyyy+/g, "$1" + y);
  format = format.replace(/(^|[^\\])yy/g, "$1" + y.toString().substr(2, 2));
  format = format.replace(/(^|[^\\])y/g, "$1" + y);

  var M = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  format = format.replace(/(^|[^\\])MMMM+/g, "$1" + MMMM[0]);
  format = format.replace(/(^|[^\\])MMM/g, "$1" + MMM[0]);
  format = format.replace(/(^|[^\\])MM/g, "$1" + ii(M));
  format = format.replace(/(^|[^\\])M/g, "$1" + M);

  var d = utc ? date.getUTCDate() : date.getDate();
  format = format.replace(/(^|[^\\])dddd+/g, "$1" + dddd[0]);
  format = format.replace(/(^|[^\\])ddd/g, "$1" + ddd[0]);
  format = format.replace(/(^|[^\\])dd/g, "$1" + ii(d));
  format = format.replace(/(^|[^\\])d/g, "$1" + d);

  var H = utc ? date.getUTCHours() : date.getHours();
  format = format.replace(/(^|[^\\])HH+/g, "$1" + ii(H));
  format = format.replace(/(^|[^\\])H/g, "$1" + H);

  var h = H > 12 ? H - 12 : H == 0 ? 12 : H;
  format = format.replace(/(^|[^\\])hh+/g, "$1" + ii(h));
  format = format.replace(/(^|[^\\])h/g, "$1" + h);

  var m = utc ? date.getUTCMinutes() : date.getMinutes();
  format = format.replace(/(^|[^\\])mm+/g, "$1" + ii(m));
  format = format.replace(/(^|[^\\])m/g, "$1" + m);

  var s = utc ? date.getUTCSeconds() : date.getSeconds();
  format = format.replace(/(^|[^\\])ss+/g, "$1" + ii(s));
  format = format.replace(/(^|[^\\])s/g, "$1" + s);

  var f = utc ? date.getUTCMilliseconds() : date.getMilliseconds();
  format = format.replace(/(^|[^\\])fff+/g, "$1" + ii(f, 3));
  f = Math.round(f / 10);
  format = format.replace(/(^|[^\\])ff/g, "$1" + ii(f));
  f = Math.round(f / 10);
  format = format.replace(/(^|[^\\])f/g, "$1" + f);

  var T = H < 12 ? "AM" : "PM";
  format = format.replace(/(^|[^\\])TT+/g, "$1" + T);
  format = format.replace(/(^|[^\\])T/g, "$1" + T.charAt(0));

  var t = T.toLowerCase();
  format = format.replace(/(^|[^\\])tt+/g, "$1" + t);
  format = format.replace(/(^|[^\\])t/g, "$1" + t.charAt(0));

  var tz = -date.getTimezoneOffset();
  var K = utc || !tz ? "Z" : tz > 0 ? "+" : "-";
  if (!utc) {
      tz = Math.abs(tz);
      var tzHrs = Math.floor(tz / 60);
      var tzMin = tz % 60;
      K += ii(tzHrs) + ":" + ii(tzMin);
  }
  format = format.replace(/(^|[^\\])K/g, "$1" + K);

  var day = (utc ? date.getUTCDay() : date.getDay()) + 1;
  format = format.replace(new RegExp(dddd[0], "g"), dddd[day]);
  format = format.replace(new RegExp(ddd[0], "g"), ddd[day]);

  format = format.replace(new RegExp(MMMM[0], "g"), MMMM[M]);
  format = format.replace(new RegExp(MMM[0], "g"), MMM[M]);

  format = format.replace(/\\(.)/g, "$1");

  return format;
};

function getCandleDateForCanvas(dateTime)
{
  if(dateTime.length>0)
  {
    var candleDateTime = dateTime.split("T");
    
    var candleDate = candleDateTime[0];
    candleDate = candleDate.split('-');
    var candleTime = candleDateTime[1];
    candleTime = candleTime.split(':');
    var candleHour = candleTime[0];
    var candleMinute = candleTime[1].split('.');
    candleMinute = candleMinute[0];
    var dateTimeFormated = new Array();
    dateTimeFormated['year'] = candleDate[0];
    dateTimeFormated['month'] = candleDate[1];
    dateTimeFormated['day'] = candleDate[2];
    dateTimeFormated['hour'] = candleHour;
    dateTimeFormated['minute'] = candleMinute;
    return dateTimeFormated;
  } 

 
}
function displayGraphicConf(instrument,accountID,callback)
{
  /*getGlobalConfById(idConf,function(rowConf)
  {*/
    var instrument = instrument;
    
      client.getInstruments(instrument,100,'H1',function(error, candles){
     
      if(error=='null')
      {}
      else
      {   
        var chart = new cjs.CandleChart();
        var bars = new cjs.Bars('AAPL', 60000);                             
        var Bull = 0;
        var Bear = 0;
        var DOJI = 0;
        var inputData = "Date,Open,Close,High,Low\n";
       Object.keys(candles).forEach(function(key) 
       {
        var candle = candles[key];
        bars.add(new Date(candle.time).getTime(), candle.mid.o, candle.mid.h, candle.mid.l, candle.mid.c, candle.volume);
        inputData = inputData.concat(candle.time.replace(".000000000Z","")+","+candle.mid.o+","+candle.mid.c+","+candle.mid.h+","+candle.mid.l+"\n")
        var closeCandle = candle.mid.c; 
        var openCandle  = candle.mid.o; 
        
        if(parseFloat(closeCandle) < parseFloat(openCandle))
        {
          Bear++;
        }
        else if(parseFloat(closeCandle) > parseFloat(openCandle))
        {
          Bull++;
        }
        else
        {
          DOJI++;
        }         
       });
       var bu_beTotal = parseInt(Bull)+parseInt(Bear);
       var bearPercent =  (parseInt(Bear)/bu_beTotal) * 100;
       var bullPercent = (parseInt(Bull)/bu_beTotal) * 100; 
 
       chart.addSeries(bars);
       //chart.outputTo(document.getElementById('chart'));
       //chart.render();
       jQuery("#instrumentChartMain").dialog({
        modal: true,
        resizable: false,
        title: ' Graph for '+instrument,
        open: function(){

                          
                                jQuery('.ui-dialog').css({
                                  'width': $(window).width(),
                                  'height': "auto",
                                  'left': '0px',
                                  'top':'0px',
                                  'position':'absolute'
                                });
                                  jQuery("#traddingMainContent").fadeOut(function(){
                                  jQuery(".trading-bar").fadeOut()
                                  //chartCandles.fadeIn();
                                  jQuery(".bull-value").text(Math.round(bullPercent)+"%");
                                  jQuery(".bear-value").text(Math.round(bearPercent)+"%");
                                //  setTimeout(function() 
                                 // {
                                  displayCandlesGraph(inputData);
                                  displayMACDGraph(instrument,accountID);
                                  displayMACDMacroGraph(instrument,accountID);
                                  displayMACDSmallGraph(instrument,accountID);
                                  displayMACDMicroGraph(instrument,accountID);
                                  
                                  getGlobalConfByAccountAndInstrument(accountID, instrument, function(err,globalConf){
                                  /*display macd values*/  
                                  var macdValue =  JSON.parse(globalConf.macd);
                                  jQuery(".macd-time").text(macdValue.time.replace("T"," at "));
                                  jQuery(".macd-order").text(macdValue.signalOrder);
                                  
                                  if(macdValue.signalOrder=="Buy")
                                      jQuery(".macd-order").css("color","green");
                                  else
                                      jQuery(".macd-order").css("color","red");

                                  /*display macd macro values*/  
                                  var macdValue =  JSON.parse(globalConf.macdMacro);
                                  jQuery(".macd-macro-time").text(macdValue.time.replace("T"," at "));
                                  jQuery(".macd-macro-order").text(macdValue.signalOrder);
                                  
                                  if(macdValue.signalOrder=="Buy")
                                      jQuery(".macd-macro-order").css("color","green");
                                  else
                                      jQuery(".macd-macro-order").css("color","red");

                                       /*display macd small values*/  
                                  var macdValue =  JSON.parse(globalConf.macdSmall);
                                  jQuery(".macd-small-time").text(macdValue.time.replace("T"," at "));
                                  jQuery(".macd-small-order").text(macdValue.signalOrder);
                                  
                                  if(macdValue.signalOrder=="Buy")
                                      jQuery(".macd-small-order").css("color","green");
                                  else
                                      jQuery(".macd-small-order").css("color","red");

                                  /*display macd micro values*/  
                                  var macdValue =  JSON.parse(globalConf.macdMicro);
                                  jQuery(".macd-micro-time").text(macdValue.time.replace("T"," at "));
                                  jQuery(".macd-micro-order").text(macdValue.signalOrder);
                                  
                                  if(macdValue.signalOrder=="Buy")
                                      jQuery(".macd-micro-order").css("color","green");
                                  else
                                      jQuery(".macd-micro-order").css("color","red");

                                  });
                                //}, 3000);
                                  $("#macd-graph").appendTo("#macd-graphdialog");
                                  $("#clandestick-graph").appendTo("#clandestick-graphdialog");
                                  jQuery(".graphTitles").fadeIn();
                                  jQuery(".signalInfo").fadeIn();
                                  return callback();
                                }); 
                             
                          
                          
                        },
        close: function()
        {
          jQuery(".graphTitles").fadeOut();
          jQuery(".signalInfo").fadeIn();
          //chartCandles.fadeOut();    
          jQuery(".trading-bar").fadeIn();
          jQuery("#traddingMainContent").fadeIn();    
        }
     });        
      }
    });
  /*});*/
}

function displayMACDMacroGraph(instrument,accountID)
{
    var clientCSVPath = __dirname+"/indicators-csv/"+accountID;
    var options = {};
    options.series = {};
    options.series['MACD'] = {axis: 'y2'};
    options.series['Signal'] = {axis: 'y2'};
    options.series['Histogram'] = {axis: 'y2'};
    options.visibility = [false, true, true, false, true] ;
    options.axes = {y1: {labelsKMB: true, independentTicks: true}, y2: {labelsKMB: true, independentTicks: true}};
    console.log(clientCSVPath+"/MACD-macro-"+instrument+".csv")
    const g = new Dygraph('graphMacroDiv', clientCSVPath+"/MACD-macro-"+instrument+".csv", options);
}

function displayMACDSmallGraph(instrument,accountID)
{
    var clientCSVPath = __dirname+"/indicators-csv/"+accountID;
    var options = {};
    options.series = {};
    options.series['MACD'] = {axis: 'y2'};
    options.series['Signal'] = {axis: 'y2'};
    options.series['Histogram'] = {axis: 'y2'};
    options.visibility = [false, true, true, false, true] ;
    options.axes = {y1: {labelsKMB: true, independentTicks: true}, y2: {labelsKMB: true, independentTicks: true}};
    console.log(clientCSVPath+"/MACD-small-"+instrument+".csv")
    const g = new Dygraph('graphSmallDiv', clientCSVPath+"/MACD-small-"+instrument+".csv", options);
}

function displayMACDMicroGraph(instrument,accountID)
{
    var clientCSVPath = __dirname+"/indicators-csv/"+accountID;
    var options = {};
    options.series = {};
    options.series['MACD'] = {axis: 'y2'};
    options.series['Signal'] = {axis: 'y2'};
    options.series['Histogram'] = {axis: 'y2'};
    options.visibility = [false, true, true, false, true] ;
    options.axes = {y1: {labelsKMB: true, independentTicks: true}, y2: {labelsKMB: true, independentTicks: true}};
    console.log(clientCSVPath+"/MACD-micro-"+instrument+".csv")
    const g = new Dygraph('graphMicroDiv', clientCSVPath+"/MACD-micro-"+instrument+".csv", options);
}

function displayMACDGraph(instrument,accountID)
{
    var clientCSVPath = __dirname+"/indicators-csv/"+accountID;
    var options = {};
    options.series = {};
    options.series['MACD'] = {axis: 'y2'};
    options.series['Signal'] = {axis: 'y2'};
    options.series['Histogram'] = {axis: 'y2'};
    options.visibility = [false, true, true, false, true] ;
    options.axes = {y1: {labelsKMB: true, independentTicks: true}, y2: {labelsKMB: true, independentTicks: true}};
    console.log(clientCSVPath+"/MACD-"+instrument+".csv")
    const g = new Dygraph('graphdiv', clientCSVPath+"/MACD-"+instrument+".csv", options);
}

function displayCandlesGraph(candleData)
{
  g2 = new Dygraph(
    document.getElementById("candle-chart"),
    candleData,
    {
      plotter: candlePlotter
    });
}
function candlePlotter(e) {
  var BAR_WIDTH = 8;
  // This is the officially endorsed way to plot all the series at once.
  if (e.seriesIndex !== 0) return;
  var setCount = e.seriesCount;
  if (setCount != 4) {
    throw "Exactly 4 prices each point must be provided for candle chart (open close high low)";
  }
  var prices = [];
  var price;
  var sets = e.allSeriesPoints;
  for (var p = 0 ; p < sets[0].length; p++) {
    price = {
      open : sets[0][p].yval,
      close : sets[1][p].yval,
      high : sets[2][p].yval,
      low : sets[3][p].yval,
      openY : sets[0][p].y,
      closeY : sets[1][p].y,
      highY : sets[2][p].y,
      lowY : sets[3][p].y
    };
    prices.push(price);
  }
  var area = e.plotArea;
  var ctx = e.drawingContext;
  ctx.strokeStyle = '#202020';
  ctx.lineWidth = 0.6;
  for (p = 0 ; p < prices.length; p++) {
    ctx.beginPath();
    price = prices[p];
    var topY = area.h * price.highY + area.y;
    var bottomY = area.h * price.lowY + area.y;
    var centerX = area.x + sets[0][p].x * area.w;
    ctx.moveTo(centerX, topY);
    ctx.lineTo(centerX, bottomY);
    ctx.closePath();
    ctx.stroke();
    var bodyY;
    if (price.open > price.close) {
      ctx.fillStyle ='rgba(244,44,44,1.0)';
      bodyY = area.h * price.openY + area.y;
    }
    else {
      ctx.fillStyle ='rgba(44,244,44,1.0)';
      bodyY = area.h * price.closeY  + area.y;
    }
    var bodyHeight = area.h * Math.abs(price.openY - price.closeY);
    ctx.fillRect(centerX - BAR_WIDTH / 2, bodyY, BAR_WIDTH,  bodyHeight);
  }
}
function getGlobalConfByAccountAndInstrument(accountId, instrument, callback)
  {    
    DBPool.getConnection(function(err, connection) 
    {
      connection.query("SELECT * FROM globalConfiguration WHERE accountId='"+accountId+"' AND instrument='"+instrument+"'", function (error, results) 
      {
        connection.release(); 
        return callback(error, results[0])
      })
    });
  } 