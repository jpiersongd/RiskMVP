        // Aggregation functions for PerfCounterAI------------------------------------------------
        //----------------------------------------------------------------------------------------
        // Product Manager, Developer: Jim Pierson
        // MIT License. See https://opensource.org/licenses/MIT

        //For Testing:
        const workerScript = `
        importScripts('http://localhost:3000/RiskMVP_worker.0.1.js');
        `;
        //For production:
        //const workerScript = `
        //importScripts('https://soundmotion.app/RiskMVP_worker.0.1.js');
        //`; 

       const workerCount = 5; // Number of workers 
       const totalBatches = 10; // Make it a multiple of the workerCount so each worker gets a batch.


        function findCounterInparsedData(clickedHeader) {
            console.log(`findCounterInparsedData parsedData.length: `, parsedData[0].length);
            const columnIndex = parsedData[0].findIndex(header => normalizeHeader(header).includes(clickedHeader));
            //get the values for the matching header
            let columnValues = parsedData.slice(2).map(function (row) {return row[columnIndex ]; });  //was +1 BUG
            //console.log(`findCounterInparsedData: columnIndex= `, columnIndex, `columnValues=`,columnValues)
            let normalizedValuesO = normalize(columnValues); // fit all the values into a zero to one range relative to their min and max   
            return normalizedValuesO
        }

        // Normalize a header by removing unwanted characters
        function normalizeHeaderold1(header) {
            //return header.replace(/\\/g, '\\\\').replace(/\n/g, ''); // Normalize backslashes and remove newlines
            return header;
        }

        function normalizeHeader(longHeader) { //same as shortenCounterName 7 in worker with added 0x00 filter
            // Regular expression to match and extract the counter name after the device name
            const regex = /\\[^\\]+\\(.+)/;
            // Apply the regex and extract the shortened counter name
            const match = regex.exec(longHeader);
            if (longHeader.includes('Information')) {
                //console.log(`normalizeHeader: longHeader= `,longHeader, `match=`, match );
            } 
            if (match && match.length > 1) {
                const withoutZeros = match[1].replace(/0x00000000/g, '');
                return withoutZeros;
            } else {
                return longHeader.replace(/0x00000000/g, ''); // Return the original string if no match is found
            }

        }


        function preProcess(parsedData) {
            updateProgress(0, 0, "preProcess: starting");
            let resultarr = [];
            const st = Date.now();
            const pDl = parsedData[0].length; // array 180 samples wide and 1334 counters high, for example
            console.log(st, ` preProcess: parsedData[0].length= ${pDl}`);
            for (let c = 0; c < pDl; c++) { 
                //console.log(st, ` preProcess: trying c= ${c}`);
                try {
                    const rowValues = parsedData.slice(2).map((row) => parseFloat(row[c].replace(/"/g, '')));
                    let rVl = rowValues.length;
                    //console.log(st, ` preProcess: c=${c} rowValues.length= ${rVl}`);
                    let maxValue = Math.max(...rowValues).toFixed(3); 
                    
                    if (maxValue > 0) {
                        const [changepointIndex1, changepointIndex2]  = getchangepointIndex(rowValues);
                        if (changepointIndex1 < rVl && changepointIndex2 < rVl) {
                            //console.log(st, ` preProcess: c=${c} changepointIndex1= ${changepointIndex1} changepointIndex2= ${changepointIndex2}`);
                            rowdata = {
                                "changepointIndex1": changepointIndex1,
                                "changepointIndex2": changepointIndex2
                            };                
                            resultarr.push(rowdata); 
                        }
                    }
                } catch (error){
                    // safe to ignore. Normal to overrun the count since we are skipping zero counters
                    //console.log(`preProcess: error`, error);
                    break;  // exit the loop
                }
            }  
            const now = Date.now();
            //console.log(now, ` preProcess: duration=${now-st} resultarr.length=`, resultarr.length);
            postProcess(resultarr);   
            return `preProcess success`; 
        }

        function postProcess(data) {
            // This is a Meta level aggregation done after the CalculateStats on the whole of the table data
            st = Date.now();
            console.log(st, ` postProcess: starting, data.length=`, data.length);
            updateProgress(0, 0, "postProcess: starting");
            // Extract the columns for changePointIndex1 and changePointIndex2
            let changePointIndex1Values = [];
            let changePointIndex2Values = [];
            modeCPI1 = 0; //default
            modeCPI1b = 0;
            modeCPI2 = 0;
            try{
                changePointIndex1Values = data.map(row => row.changepointIndex1);
                changePointIndex2Values = data.map(row => row.changepointIndex2);
            } catch (error) {
                console.log(Date.now(), ` postProcess: starting, error=`, error);
            }
            console.log(Date.now(), ` postProcess: changePointIndex1Values`, changePointIndex1Values);
            console.log(Date.now(), ` postProcess: changePointIndex2Values`, changePointIndex2Values);

            defaultMiddle = (Math.floor(maxLines/2)-1) ;
            console.log(Date.now(), ` postProcess: defaultMiddle=`, defaultMiddle);

            // Find the mode for each column
            modeCPI1 = findMode(changePointIndex1Values.filter(value => value != defaultMiddle));
            if ( !modeCPI1) {   // no mode in up data set
                modeCPI1 = Math.floor(maxLines*.2);  //defaulting to 20% towards tail end
                console.log(Date.now(), ` postProcess: using default modeCPI1b=${modeCPI1b}`);
            }
            console.log(Date.now(), ` postProcess: modeCPI1= ${modeCPI1}`);

            //Find CPI1b, the Endpoint for CPI1
            // Filter to include only rows where the CP1 mode interval [30] is present
            let cp1ModeRows = data.filter(row => row.changepointIndex1 === modeCPI1);
            console.log(Date.now(), ` postProcess: cp1ModeRows.length=`, cp1ModeRows.length);
            // Extract the decline values from these filtered rows
            let declineValuesForCP1 = cp1ModeRows.map(row => row.changepointIndex2);
            console.log(Date.now(), ` postProcess: declineValuesForCP1.length=`, declineValuesForCP1.length);
            // find the most populated change interval after the midpoint.
            modeCPI1b = findMode(declineValuesForCP1.filter(value => value > defaultMiddle ));
            if ( !modeCPI1b) {   // no mode between the two data sets (up/dwn)
                modeCPI1 = Math.floor(maxLines*.2);  //defaulting CPI1 to 20% towards tail end. Resetting CPI1 ensures 1b is always coes after.
                modeCPI1b = Math.floor(maxLines*.8);  //defaulting CPI1b to 80% towards tail end
                console.log(Date.now(), ` postProcess: using default modeCPI1b=${modeCPI1b}`);
            }
            console.log(Date.now(), ` postProcess: modeCPI1= ${modeCPI1} modeCPI1b=${modeCPI1b}`);
          


            //document.getElementById('Changepoint1').textContent = `Start Load sample interval: ${modeCPI1}`;
            //document.getElementById('Changepoint1b').textContent = `Stop Load sample interval: ${modeCPI1b}`;
            //document.getElementById('Changepoint2').textContent = `Intervals with most Decline: ${modeChangePointIndex2}, ${secondModeChangePointIndex2} `;
            console.log(Date.now(), ` postProcess completed, duration=`, Date.now()-st);
            updateProgress(0, 0, "PostProcess: completed");
            return `Successful Post Process`;
        }

           
        //Find the interval with the biggest change to slope
        function getchangepointIndex(Values) {
            let largestChange = .01;  //set a min bar above zero
            let diffValue = [];
            const vl = Values.length;
            let largestGrowthInterval = vl;
            let LargestDeclineInterval = vl;
            //console.log(Date.now(), `getchangepointIndex: from preProcess, Values=`, Values);
            //loop through all the values to get the biggest increasing change
            for (let i = 3; i < vl; i++) {
                const earlySample = (parseFloat(Values[i - 1]) + parseFloat(Values[i - 2]));
                //console.log(`getchangepointIndex: from preProcess, i=${i} earlySample=`, earlySample);
                const lateSample = (parseFloat(Values[i]) + parseFloat(Values[i+1]));
                diffValue = (parseFloat(lateSample - earlySample)); //positive only
                if (diffValue > largestChange) {
                    largestChange = diffValue;
                    largestGrowthInterval = i; // Store the sample interval with the largest change 
                }
            }
            largestChange = .01; // reset
            // loop again to get biggest decreasing changes
            for (let i = 3; i < Values.length; i++) {
                const earlySample = (parseFloat(Values[i - 1]) + parseFloat(Values[i - 2]));
                const lateSample = (parseFloat(Values[i]) + parseFloat(Values[i+1]));
                diffValue = (parseFloat(earlySample- lateSample)); //negative only
                //diffValue = Math.abs(parseFloat(lateSample) - parseFloat(earlySample));  // absolute
                if (diffValue > largestChange ) {
                    largestChange = diffValue;
                    LargestDeclineInterval = i; // Store the sample interval with the largest change  
                }
            }
            return [largestGrowthInterval,LargestDeclineInterval] ;
        }



        // Function to find the mode of an array
        function findModeOld(arr) {
            const frequencyMap = {};
            let maxFrequency = 0;
            let mode = null;
            for (const value of arr) {
                frequencyMap[value] = (frequencyMap[value] || 0) + 1;
                if (frequencyMap[value] > maxFrequency) {
                    maxFrequency = frequencyMap[value];
                    mode = value;
                }
            }
            return mode;
        }

        function findMode(arr) {
            if (arr.length === 0) return null; // Return null if array is empty
            let frequencyMap = {};
            let maxCount = 0;
            let mode = null;
          
            for (let value of arr) {
              if (frequencyMap.hasOwnProperty(value)) {
                frequencyMap[value]++;
              } else {
                frequencyMap[value] = 1;
              }
          
              if (frequencyMap[value] > maxCount) {
                maxCount = frequencyMap[value];
                mode = value;
              }
            }
          
            // Check if the mode is unique and appears more than once
            const isModeUnique = Object.values(frequencyMap).filter(count => count === maxCount).length === 1;
            if (maxCount > 1 && isModeUnique) {
              return mode;
            } else {
              return null; // Or throw an error if no mode is found
            }
          }
          

          


        function percentageValue(point, maxValue) {
            // Calculate the point as a percentage of the maxValue
            //console.log(`percentageValue point is ${point}, maxValue is ${maxValue}`);
            try {
                let value = Math.round((parseFloat(point) / parseFloat(maxValue)) *100);
                //console.log(`percentageValue calculated is ${value}`);
                return value;
            } catch (error) {
                console.log(Date.now(), ` percentageValue: calculated ZERO, error msg: ${error}`);
                return 0;
            }
        }


        // Assuming PapaParse is available in your environment
        function parseCSV(data, fileIndex) {
            console.log(Date.now(), "parseCSV: Beginning parse of CSV file.");
            fullSt = Date.now();
            // Use PapaParse to parse the CSV data
            Papa.parse(data, {
                header: true, // Use the first row as headers
                dynamicTyping: true, // Automatically convert numeric and boolean values
                skipEmptyLines: true, // Skip empty lines to avoid parsing issues
                complete: function(results) {
                    console.log(Date.now(), "parseCSV: Finished parsing CSV data.", results.data.length, results.data);

                    parsedData = results;
                    let processedRisks = processRiskFileData (results.data);
                    console.log(Date.now(), ` file1Reader: postProcess results=`, processedRisks);

                    // Optionally, here you can process results.data as needed or return it directly
                    // For example, adjusting data format, cleaning data, etc.

                    // Assuming you want to directly use the parsed data for further processing or visualization
                    // Update any UI elements or pass this data to another function as needed
                    // document.getElementById(`file${fileIndex}IntervalCount`).textContent = `${results.data.length} Sample Intervals`;

                    // If you need to directly return the data from this function, consider that PapaParse's complete callback is asynchronous
                    // You might need to adapt your code flow to handle asynchronous results
                }
            });

            // Note: Since PapaParse's parsing is asynchronous, any return statement here would execute before parsing completes
            // Consider using callbacks or Promises to handle asynchronous data flow
            
        }


        // Function to parse CSV file data using PapaParse - this file has the counter names in columns horizontally
        function parseCSVOld(data, fileIndex) {
            fullSt = Date.now();
            console.log(fullSt, ` parseCSV: Global vars reset, beginning parse of CSV file. datalength=`, data.length);
            clearGlobalVars();

            const lines = data.trim().split('\n'); // Split the data into lines
            // Extract the header line and split it into column names
            const headerLine = lines[0];
            const headers = headerLine.split(',');
            parsedData = []; // Initialize an array to hold the parsed data, including the headers
            parsedData.push(headers); // Push the Countername headers as the first row
            // Start parsing from the second line (skipping the header)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const values = line.split(',');
                // Push the row values to the parsed data array
                parsedData.push(values);
                maxLines = i;
            }
            //document.getElementById(`file${fileIndex}IntervalCount`).textContent = `${maxLines} Sample Intervals`; 
            console.log(Date.now(), ` parseCSV: parsed CSV data.length`, parsedData[0].length, parsedData);
            return parsedData;
        }





        function updateProgress(i, total, msg) {
            requestAnimationFrame(() => {
                const progressPopup = document.getElementById('progressPopup');
                if (total != 0) {
                    //console.log(Date.now(), ` updateProgress: batch=`, i, `of=`, total);
                    progressPopup.innerHTML = `${i}/${total}`;
                } else {
                    //console.log(Date.now(), ` updateProgress:`, msg);
                    progressPopup.innerHTML = `${msg}`;
                } 

                if (msg === "Done"){
                    FullDuration= Date.now()-fullSt;
                    console.log(Date.now(), ` updateProgress: Done--------`, msg, ` Full Page Duration=`, FullDuration);
                    progressPopup.style.visibility = 'hidden';
                    progressPopup.style.display = 'none';
                } else {
                    progressPopup.style.display = 'block';
                    progressPopup.style.visibility = 'visible';
                }
            }, 0);
            progressPopup.offsetHeight; //force a reflow
        }
      
/* 
        // Function to calculate statistics for a parsed CSV file and update the chart
        function calculateFileStatistics(parsedData, fileIndex, iteration) {
            //console.log(Date.now(), ` calculatingFileStats: parsedData=`, parsedData);
            altTransposedAggData = []; // clear array from any previous run
            lastScrolledtoRowNumber = 4;
            counterCount = parsedData[0].length; //Global Calc the number of perf counter columns
            //console.log(Date.now(), ` calculatingFileStats: counterCount=`, counterCount);
            const timestamps = parsedData.slice(1).map((row) => Date.parse(row[0]));
            const elapsedTimeInSeconds = (Math.max(...timestamps) - Math.min(...timestamps)) / 1000;   
            //console.log(Date.now(), ` calculatingFileStats: timestamps=`, timestamps);       

            let batchSize = Math.ceil((counterCount - 1) / totalBatches ); // Size of each batch
            if (batchSize < 1) {batchSize = 1;} // default safety net for single counter files for example ECG files
            //console.log(Date.now(), ` calculatingFileStats: batchSize=`, batchSize);  

            let taskQueue = [];
            let combinedAltTransposedAggData = [];
            let totalNotCounted = 0;
            let activePromises = [];
            //let completedTasks = 0;
            let b = 0;
            let activeWorkers = workerCount; 
            let totaldur= 0; // for tracking how long the process takes
            updateProgress(0, 0, "Calculating Stats");


            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize + 1;
                const stop = Math.min((i + 1) * batchSize, counterCount);
                console.log(Date.now(), ` calculateFileStatistics: start=`, start, `stop=`, stop);
                if (start > stop) { 
                    i = totalBatches;
                    console.log(Date.now(), ` calculateFileStatistics: stop making new tasks start=`, start, `stop=`, stop);
                 }  // stop making new tasks
                else {
                    taskQueue.push({ start, stop });
                    console.log(Date.now(), ` calculateFileStatistics: push to taskQueue start=`, start, `stop=`, stop);
                }
            }
            function processNextTask(worker, i) {
                console.log(Date.now(), ` processNextTask: taskQueue.length=`, taskQueue.length);
                if (taskQueue.length === 0) {
                    worker.terminate(); // Terminate the worker if no more tasks
                    activeWorkers--; // Decrement the number of active workers
                    if (activeWorkers === 0) {
                        // When all tasks are completed
                        Promise.all(activePromises).then(() => {
                            console.log(Date.now(), ` calculateFileStatistics: All tasks completed: w=${workerCount} b=${totalBatches} totalDur=${totaldur} notcounted=${totalNotCounted}, counted=${combinedAltTransposedAggData.length}`);
                            updateProgress(0, 0, "Building Table");
                            altTransposedAggData = combinedAltTransposedAggData;
                                updateStatsText(counterCount, elapsedTimeInSeconds, totalNotCounted);
                                buildTable(altTransposedAggData);

                        });        
                    }
                }
                
                const task = taskQueue.shift(); // Get the next task
                const promise = new Promise((resolve, reject) => {
                    if (task) {
                        worker.onmessage = event => resolve(event.data);
                        worker.onerror = reject;
                    }
                });
                let st = Date.now();
                if (task) {
                    console.log(Date.now(), ` calculateFileStatistics: postMessage to worker `, i, ` task=`, task);
                    worker.postMessage({ parsedData, elapsedTimeInSeconds, start: task.start, stop: task.stop, normalizedKPI1Values, b, i, st, modeCPI1, modeCPI1b });
                    activePromises.push(promise);
                }


                promise.then(([promiseData, notcounted, st]) => {
                    combinedAltTransposedAggData = combinedAltTransposedAggData.concat(promiseData);
                    totalNotCounted += notcounted;
                    updateProgress(b, totalBatches);
                    let dur = Date.now() - st;
                    totaldur += dur;
                    console.log(Date.now(), ` calculateFileStatistics: worker i=`, i, ` batch order `, b, ` dur=`, dur, ` returned promiseData=`, promiseData, `notcounted=`, notcounted);
                    b++;  //update batch count
                    processNextTask(worker, i); // Process the next task with the same worker
                });
            }
            // Initialize workers and start processing
            for (let i = 0; i < workerCount; i++) {
                console.log(Date.now(), ` calculateFileStatistics: worker i=`, i, ` batch order `, b, `creating a new worker`);
                const blob = new Blob([workerScript], { type: 'application/javascript' });
                const worker = new Worker(URL.createObjectURL(blob));
                processNextTask(worker, i );
            }
            updateProgress(0, 0, `Prepping Workers`);        
        }   
 */

               
        


        // map the actual values to the same scale of zero to one
        function normalize(values) {    
            //console.log(`normalize: These are Floats`, values);
            try {
                values = values.map((value) => Number(value.replace(/"/g, '')));
            } catch (error) {}
            
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            const range = maxValue - minValue;
            //console.log(`normalize: minValue ${minValue} maxValue ${maxValue} range ${range}`);
  
            if (range === 0) { // Check if range is zero
                return Array(values.length).fill(0); //eturn an array of zeros, same length as values
            } else {
                return values.map((value) => parseFloat(((value - minValue) / range).toFixed(3))); //normailze
            }
        }

      


        async function setKPI(Countername) {
            console.log(Date.now(), ` setKPI: starting for Countername=`, Countername);
            //KPI1Countername = Countername; // update global var
            //KPIcounter_list_array = []; //resetting to blank - this could be smarter.. tbd    // changed to not reset it so we can can more than one.
            let currentKPIcounter_list_array_length = KPIcounter_list_array.length;
            lastFilterClicked = 'KPI'; // tells order listener to push rows into KPIcounter_array
            //console.log(Date.now(), ` setKPI: normalizing the KPIValues=`);
            normalizedKPI1Values = findCounterInparsedData(Countername);
            //console.log(Date.now(), ` setKPI: normalizedKPIValues=`, normalizedKPI1Values);
            console.log(Date.now(), ` setKPI: calling to calculateFileStatistics with normalizedKPI1Values=`, normalizedKPI1Values, `for countername=`, Countername);
            
            calculateFileStatistics(parsedData, 1, 1); // rerun this process to update the Similarity column

            async function waitForKPICounterData() {
                // Check if the array is empty
                while (Object.keys(KPIcounter_list_array).length === currentKPIcounter_list_array_length) {
                    // Wait for a short interval before checking again
                    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 1 second
                }
                //document.querySelector('#KPICounter_text').innerHTML = `<b>Key Perf Indicator Counter:</b><br>${JSON.stringify(KPIcounter_list_array[0].Countername)}`;

                let htmlContent = `<b>Key Perf Indicator Counter:</b><br>- ${JSON.stringify(KPIcounter_list_array[0].Countername)}`;
                for (let i = 1; i < KPIcounter_list_array.length; i++) { // Append additional counters if they exist
                        htmlContent += `<br>- ${JSON.stringify(KPIcounter_list_array[i].Countername)}</br>`;
                }
                document.querySelector('#KPICounter_text').innerHTML = htmlContent; // Set the updated HTML content
                console.log(Date.now(), ` setKPI: completed, updated KPICounter_text with KPIcounter_list_array=`, KPIcounter_list_array);
            }
            // Call the function to start waiting for data
            waitForKPICounterData(); 
        }
