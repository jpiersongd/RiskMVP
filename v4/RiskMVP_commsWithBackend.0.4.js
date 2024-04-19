// Define an array to hold the results
let resultsArray = [];

// Define the URL of your API endpoint
const apiUrl = 'https://379j3mqsp8.execute-api.us-west-2.amazonaws.com/038/getAnalysis';


//curl -i -H "Origin: http://example.com" -X GET https://379j3mqsp8.execute-api.us-west-2.amazonaws.com/default3/getAnalysis


// Function to call the API and store the results in an array
function fetchAnalysisDataP(Growingcounter_list_array,Decliningcounter_list_array, KPIcounter_list_array ) {
    const st = Date.now();
    let dur = 0;
    console.log(Date.now(), ` fetchAnalysisData: SENDING fetch, Growth array=`, Growingcounter_list_array, `and Decliningcounter_list_array=`, Decliningcounter_list_array, `KPI1Countername=`, KPIcounter_list_array);
    document.querySelector('#GPTmsg_text').innerHTML = `<b>Communicating with OpenAI Assistant now..</b>`;


    const requestBody = { // Create the request body with the counter list data
        Growingcounter_list_array, 
        Decliningcounter_list_array,
        KPIcounter_list_array
    };

    fetch(apiUrl, {
        method: 'POST', // send data
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestBody), // Convert the data to JSON format
    })
    .then(response => {  //wait for the response
        if (!response.ok) {throw new Error(`Network response was not ok. response=`, response);}
        return response.json(); // Parse the JSON in the response
    })
    .then(data => { // parse the data
        dur = Date.now() - st; // measure elapsed time duration
        const resultsArray = data;
        console.log(Date.now(), ` fetchAnalysisData: RESPONSE resultsArray=`, resultsArray);

        const GPTmsg = resultsArray.GPTmsg;
        const GPTmsgContent = GPTmsg.choices[0].message.content;
        const vnum = resultsArray.vnum;
        console.log(Date.now(), ` fetchAnalysisData: RESPONSE GPTmsg results=`, GPTmsgContent, ` (Duration = ${dur} ms)`);

        const gptMsgDiv = document.querySelector('#dwnCounter_text');
        const divHeight = 290; 
        const divHeight2 = gptMsgDiv.scrollTop; // Get the height of the div before adding text
        document.querySelector('#GPTmsg_text').innerHTML = `<b>GPT:</b><br>`+JSON.stringify(GPTmsgContent)+`<br><sub>(Duration = ${dur} ms)</sub></br>`+ vnum;
        console.log(Date.now(), ` fetchAnalysisData: Scrolling up the text. divHeight=`, divHeight, `divHeight2=`,divHeight2); 
        $('#GPTmsg_text').parent().scrollTop(divHeight); //scroll up the div to show GPTmsg at top
        
    })
    .catch(error => {
        console.error('There was a problem with your fetch operation:', error);
        // Handle the error here, you can check the error message to determine the issue
        if (error instanceof SyntaxError) {
            // Handle the case where the response could not be parsed as JSON
            console.error('Error: Invalid JSON response from the server.');
        } else {
            // Handle other types of errors
            console.error('Error from OpenAI: Something went wrong with the fetch operation.');
            document.querySelector('#GPTmsg_text').innerHTML = JSON.stringify('<b>Error message from OpenAI: Something went wrong. Please Ask again.</b>');
        }
    });
}
