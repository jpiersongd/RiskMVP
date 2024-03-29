

var dataTable_question_mark_text = "" +
"These are the Risks most used in over 100 TDD Projects" ;


var version_help_text = "" +
"Contact Jim Pierson with any feedback about this tool."+
"\nv0.1 - Mar 21 2024 - Initial version of RiskMVP is based on v.40 of the PerfCounterAI."+
"\nv0.2 - Mar 26 2024 - Adding the IDF part of the TF-IDF formula. Will reduce weight of most popular Risks, improving context."+
"\nv0.3 - Mar 28 2024 - improving the IDF math"+
"\nv0.4 - Mar 28 2024 - Changed weights to a proper document percentage (Doc%)";

var GettingStarted_Text = "" +
"<b>Getting Started:</b>"+
"<br>Open the file containing the Ringstone Risk knowledgebase, Risk_KB.</br>"+
"<br>Google Drive App for desktop of mobile is required to be installed (for this MVP).</br>"+
"<br>Scroll through the Risks."+
"<br>We will then find the top correlating Risks.</br>";


var FileEntry_question_mark = "" +
"Open the file containg the ringstone ProjectRiskList."+
"\nYou will need the 'Google Drive for Desktop app' to map a drive."+
"\nOnce, opened, sift through the Risks by scrolling and clicking.";



// set the title
window.addEventListener('load', function() {
    this.setTimeout(function() {
        console.log(Date.now(), ` Listener for 'load': adding help_text`);
        document.querySelector('#dataTable_question_mark').setAttribute('title', dataTable_question_mark_text);
        document.querySelector('#version_help_text').setAttribute('title', version_help_text);
        document.querySelector('#FileEntry_question_mark').setAttribute('title', FileEntry_question_mark);
        document.querySelector('#GettingStarted_Text').innerHTML = GettingStarted_Text;   
    }, 100);
});


