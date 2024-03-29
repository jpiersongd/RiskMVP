

// Function to highlight a specific row by its index
function highlightRow(rowIndex, callerName) {
    if (DR = true && TR == true){
        console.log(Date.now(), ` highlightRow: highlighting -------------- begin--------------- row: `, rowIndex, `Call from: `, callerName);
        $('#csvTable tbody tr:eq(' + rowIndex + ')').trigger('click');  //send a trigger event to the table row
        //console.log(Date.now(), ` highlightRow: highlighting --------------completed------------ row:  `, rowIndex, `, Call from: `, callerName);
    } else {
        console.log(Date.now(), ` highlightRow: Not Ready when received command to highlight row: `, rowIndex, ` Call from: `, callerName);
    }

}

// Function to fetch and process the CSV file
async function loadCSVFromCDN() {
    let st = Date.now();
    try {
        // Fetch the CSV file from the CDN
        const response = await fetch(csvFilePath);
        if (!response.ok) {
            throw new Error(Date.now(), ` loadCSVFromCDN: Failed to fetch the CSV file.`);
        } 
        //console.log("loadCSVFromCDN: Loaded CSV file.", response);
        const csvContent = await response.text(); // Read the CSV content
        //console.log("CSV file loaded with length of:", csvContent.length); 
        const parsedCSVData = parseCSV(csvContent, 1); // Parse the CSV data
        console.log(Date.now(), ` loadCSVFromCDN: parsedCSVData=`, parsedCSVData, `File Load Duration=`, Date.now()-st);
        
        //clearGlobalVars();

        let results = await preProcess(parsedCSVData);
        console.log(Date.now(), ` loadCSVFromCDN: postProcess results=`, results);

        //console.log(Date.now(), ` loadCSVFromCDN: await calculateFileStatistics`);
        await calculateFileStatistics(parsedCSVData, 1, 1);  // running a second time to get updated modeCheckPointIndex columns 
        console.log(Date.now(), ` loadCSVFromCDN: done calculateFileStatistics`);

    } catch (error) {
        console.error(Date.now(), ` loadCSVFromCDN: Error loading CSV file`, error);
    }
}


function clearGlobalVars() {
    //Clear all globals and text fields
    KPI1Countername = []; //clearing previous KPIs
    normalizedKPI1Values = []; //clearing previous KPI values
    Growingcounter_list_array = [];
    Decliningcounter_list_array = [];
    KPIcounter_list_array = [];
    document.querySelector('#upCounter_text').innerHTML = ``;
    document.querySelector('#dwnCounter_text').innerHTML = ``;
    document.querySelector('#KPICounter_text').innerHTML = ``;
    document.querySelector('#GPTmsg_text').innerHTML = ``;

    try {
        clearChart('clearGlobalVars');  // fails if no chart exists but otherwises clears between file loads
    } catch {}

    console.log(Date.now(), ` clearGlobalVars: Global vars and text fields reset`);
}



        // Function to create or recreate the DataTable
        function buildTable(data) {
            //TR = true;
            updateProgress(0, 0, "Building Table");
            console.log(Date.now(), ` buildTable: looking for existing table build`, table);
            if (table) {
                console.log(Date.now(), ` buildTable: unbinding tbody and order listeners`);
                $('#csvTable').off(); // Unbind all listeners
                // Destroy the existing DataTable instance
                console.log(Date.now(), ` buildTable: clearing existing table build`);
                table.clear().draw(false); // makes destroy faster
                table.destroy();
                table = [];
                lastclickedRowNumber = 0; // reset this whenever table is created
            }
            console.log(Date.now(), ` buildTable: Building new table for data`, data);
            table = $('#csvTable').DataTable({
                data: data, // Load data from CSV formated array
                responsive: true, 
                paging: false,
                pageLength: 300,
                scrollY: '180px',
                searching: true, 
                autoWidth: true,
                columns: [
                    { title: "Risk", data: "risk" },
                    { title: "Doc%", data: "weight" },
                ],
                columnDefs: [
                    { "width": "80%", "targets": 0 , className: 'ellipsis0'}, // Set the first column width to 50%
                    { "width": "20%", "targets": 1 , className: 'ellipsis1'}, // Set the second column width to 50%
                    { 
                        type: 'num', 
                        targets: [1], 
                        render: function (data, type, row) {
                            // Check if the data is a number
                            if (type === 'display' && typeof data === 'number') {
                                // Format numbers with commas for thousands separators and pass through the decimals
                                return data.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })+`%`;
                            }
                            return data; // Return data as-is for other types or non-numeric values
                        }
                    }, 
                ],
                
                initComplete: function () { // This callback is triggered when the DataTable is fully initialized
                    console.log(Date.now(), ` buildTable: initComplete`);
                    updateProgress(0, 0, "buildTable: initComplete");
                    TR = true;

                    setTimeout(function() {
                        new $.fn.dataTable.FixedHeader(table); // setting header to fixed
                        console.log(Date.now(), ` buildTable updating setClickedRow and updateOrder Listeners`);
                        updateProgress(0, 0, "updating Listeners");
                        
                        setClickedRowListener('buildTable');
                        updateOrderListener('buildTable'); //
                        setRightClickRowListener('buildTable');

                        $('#csvTable tbody td:nth-child(1)').css('white-space', 'nowrap');

                        updateProgress(0, 0, "Done");
                        console.log(Date.now(), ` buildTable: highlighting `, showRows, ` rows.`);                    
                        
                        table.order([1, 'desc']).draw(); 
                        setScrollListener('buildTable'); //do this last. only user should scroll.
                        
                    }, 50); //adding time to ensure table completes
                    
                }
                
            }); return table;
        }



        
        // Function to create or recreate the DataTable2
        function buildTable2(data2) {
            //console.log(Date.now(), ` buildTable2: looking for existing table2 build`, table2);
            if (table2) {
                //console.log(Date.now(), ` buildTable2: unbinding tbody and order listeners`);
                $('#csvTable2').off(); // Unbind all listeners
                // Destroy the existing DataTable instance
                //console.log(Date.now(), ` buildTable2: clearing existing table build`);
                table2.clear().draw(false); // makes destroy faster
                table2.destroy();
                table2 = [];
            }
            console.log(Date.now(), ` buildTable2: Building new table for`, data2.length, `items`);
            table2 = $('#csvTable2').DataTable({
                data: data2, 
                responsive: true, 
                paging: false,
                pageLength: 300,
                scrollY: '180px',
                searching: false, 
                autoWidth: true,
                columns: [
                    { title: "Associated Risk", data: "riskName" },
                    { title: "Weight", data: "percentage" },
                ],
                columnDefs: [
                    { "width": "80%", "targets": 0, className: 'ellipsis0' }, 
                    { "width": "20%", "targets": 1, className: 'ellipsis1' }, 
                    { 
                        type: 'num', 
                        targets: [1], 
                        render: function (data, type, row) {
                            // Check if the data is a number
                            if (type === 'display' && typeof data === 'number') {
                                // Format numbers with commas for thousands separators and pass through the decimals
                                return data.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            }
                            return data; // Return data as-is for other types or non-numeric values
                        }
                    }, 
                ],
                
                initComplete: function () { // This callback is triggered when the DataTable is fully initialized
                    console.log(Date.now(), ` buildTable2: initComplete`);

                    setTimeout(function() {
                        //console.log(Date.now(), ` buildTable2 updating table2.order`);
                        $('#csvTable2 tbody td:nth-child(1)').css('white-space', 'nowrap');
                        table2.order([1, 'desc']).draw();                     
                    }, 50); //adding time to ensure table completes
                    //console.log(Date.now(), ` buildTable2 done updating`);
                    
                }
                
            }); return table2;
        }
    