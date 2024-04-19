        // Aggregation functions for PerfCounterAI------------------------------------------------
        //----------------------------------------------------------------------------------------
        // Product Manager, Developer: Jim Pierson
        // MIT License. See https://opensource.org/licenses/MIT


 
        function parseCSV(data, fileIndex) {
            console.log(Date.now(), "parseCSV: Beginning parse of CSV file.");
            updateProgress("0. Reading records");
            fullSt = Date.now();
            Papa.parse(data, {
                header: true, // Use the first row as headers
                dynamicTyping: true, // Automatically convert numeric and boolean values
                skipEmptyLines: true, // Skip empty lines to avoid parsing issues
                complete: function(results) {
                    console.log(Date.now(), "parseCSV: Finished parsing CSV data.", results.data.length, results.data);
                    parsedData = results;
                    
                    let processedRisks = processRiskFileData (results.data);
                    console.log(Date.now(), ` file1Reader: postProcess results=`, processedRisks);
                }
            });
        }




        function updateProgress(msg) {  
            //requestAnimationFrame(() => {
                console.log(Date.now(), ` updateProgress: `, msg);
                const progressPopup = document.getElementById('progressPopup');         
                progressPopup.innerHTML = msg;
                progressPopup.style.display = 'block';
                progressPopup.style.visibility = 'visible';

                if (msg === "Done"){
                    FullDuration= Date.now()-fullSt;
                    console.log(Date.now(), ` updateProgress: Done--------`, msg, ` Full Page Duration=`, FullDuration);
                    progressPopup.style.visibility = 'hidden';
                    progressPopup.style.display = 'none';
                }   
            //});
            //progressPopup.offsetHeight; //force a reflow

        }
   