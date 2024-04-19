

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


// Function to create or recreate the DataTable
function buildTable(data) {
    //TR = true;
    updateProgress("Building Table1");
    console.log(Date.now(), ` buildTable: looking for existing table1 build`, table);
    if (table) {
        console.log(Date.now(), ` buildTable: unbinding tbody and order listeners`);
        $('#csvTable').off(); // Unbind all listeners
        console.log(Date.now(), ` buildTable: clearing existing table1 build`);
        table.clear().draw(false); // makes destroy faster
        table.destroy();
        table = [];
        lastclickedRowNumber = 0; // reset this whenever table is created
    }
    console.log(Date.now(), ` buildTable: Building new table1 for data`, data);
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
            updateProgress("buildTable1: initComplete");
            TR = true;

            setTimeout(function() {
                new $.fn.dataTable.FixedHeader(table); // setting header to fixed
                console.log(Date.now(), ` buildTable1 updating setClickedRow and updateOrder Listeners`);
                
                setClickedRowListener('buildTable');
                updateOrderListener('buildTable'); //
                setRightClickRowListener('buildTable');

                $('#csvTable tbody td:nth-child(1)').css('white-space', 'nowrap');

                updateProgress("Done");
                console.log(Date.now(), ` buildTable1: highlighting `, showRows, ` rows.`);                    
                
                table.order([1, 'desc']).draw(); 
                setScrollListener('buildTable1'); //do this last. only user should scroll.
                
            }, 50); //adding time to ensure table completes
            
        }
        
    }); return table;
}


// Function to update or create the DataTable2
function buildTable2(data2) {
    // Check if the DataTable instance already exists
    if ($.fn.DataTable.isDataTable('#csvTable2')) {
        console.log(Date.now(), ` buildTable2: Updating table2 with`, data2.length, `items`);
        var table2 = $('#csvTable2').DataTable(); // Get the existing DataTable instance
        var currentSearchValue = table2.search();  // Store the current search/filter value 
        table2.clear(); // Clear the existing data
        table2.rows.add(data2); // Add new data
        table2.draw(); // Redraw the table
        table2.search(currentSearchValue).draw(); // Reapply the stored search/filter value
    } else {
        // Create the DataTable instance for the first time
        console.log(Date.now(), ` buildTable2: Creating table2 with`, data2.length, `items`);
        table2 = $('#csvTable2').DataTable({
            data: data2,
            responsive: true,
            paging: false,
            pageLength: 300,
            scrollY: '180px',
            searching: true,
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
                        if (type === 'display' && typeof data === 'number') {
                            return data.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                        }
                        return data;
                    }
                },
            ],
            initComplete: function () {
                console.log(Date.now(), ` buildTable2: initComplete`);
                setTimeout(function() {
                    $('#csvTable2 tbody td:nth-child(1)').css('white-space', 'nowrap');
                    table2.order([1, 'desc']).draw();
                }, 50); // Adding time to ensure table completes
            }
        });
    }
    return table2;
}






    