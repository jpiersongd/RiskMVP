//Globals
let riskWeightsArray = [];
const riskRiskPercentages = {};
let allPH = {};
let allRisks = {};
let riskWeights = {};

async function processRiskFileData (csvData) {
    console.log(Date.now(), " processRiskFileData: Starting the IDA-Risk process");
    //console.log(Date.now(), ` processRiskFileData: csvData=`, csvData);
    const records = csvData;
    console.log(Date.now(), ` processRiskFileData: 1. Writing records.length`, records.length);
    updateProgress("1. Writing records");
    //////// Build Project_Risk array
    const projectRisks = {};
    records.forEach(record => {
        if (!projectRisks[record.ProjectHash]) {projectRisks[record.ProjectHash] = [];}
        projectRisks[record.ProjectHash].push(record['RiskName']);
    });
    console.log(Date.now(), ` processRiskFileData: 2. Writing projectRisks.length`, projectRisks.length);
    updateProgress("2. Writing projectRisks");
    //////// Create a count of all unique Risks and Projects
    allRisks = [...new Set(records.map(record => record.RiskName))]; // Unique list of all risks
    allPH = [...new Set(records.map(record => record.ProjectHash))]; // Unique list of all ProjectHashes
    console.log(Date.now(), " processRiskFileData: 2B. count of unique Risks = ", allRisks.length, `unique ProjectHashes=`, allPH.length);
    updateProgress("2B. count of unique Risks");

    //////// Convert project_risks to a 2D array with binary values
    const projectHashRisk2D = {};
    Object.keys(projectRisks).forEach(projectHash => {
        projectHashRisk2D[projectHash] = allRisks.map(risk => projectRisks[projectHash].includes(risk) ? 1 : 0);
    });
    console.log(Date.now(), " processRiskFileData: 3. Writing the ProjectHash_Risk 2D array to a JSON length=", projectHashRisk2D.length);
    updateProgress("3. Writing the ProjectHash_Risk 2D array");
    
    //////// Create the Risk_Risk_Associations
    function calculateRiskRiskAssociations(projectHashRisk, allRisks) {
        const riskAssociations = {};
        allRisks.forEach((risk) => { riskAssociations[risk] = {};  });  // Initialize the nested object for each risk
        allRisks.forEach((risk, index) => {
            allRisks.slice(index + 1).forEach(otherRisk => {
                const associationCount = Object.values(projectHashRisk).reduce((count, projectRisks) => {
                    if (projectRisks[index] === 1 && projectRisks[allRisks.indexOf(otherRisk)] === 1) {
                        return count + 1;
                    }
                    return count;
                }, 0);
                // Since we've initialized the nested objects, this assignment should work without error
                riskAssociations[risk][otherRisk] = associationCount;
                riskAssociations[otherRisk][risk] = associationCount; // Assuming symmetry
            });
        });
        return riskAssociations;
    }
    let riskRiskAssociations = calculateRiskRiskAssociations(projectHashRisk2D, allRisks);
    console.log(Date.now(), " processRiskFileData: 4. Writing the riskRiskAssociations to JSON", riskRiskAssociations);
    updateProgress("4. Writing the riskRiskAssociations");
    
    
    /////// Function to trim decimals and remove zeros
    function trimDecimalsAndRemoveZeros(associations) {
        const filteredAssociations = {};
        Object.keys(associations).forEach(risk => {
            filteredAssociations[risk] = {};
            Object.keys(associations[risk]).forEach(otherRisk => {
                let value = associations[risk][otherRisk];
                if (value !== 0) { // Only process non-zero values
                    // Ensure the value is rounded to 4 decimal places and remains a number
                    value = Number(value.toFixed(4));
                    filteredAssociations[risk][otherRisk] = value;
                }
            });
            // After assigning trimmed values, check if the risk object is empty (if it had only zeros)
            if (Object.keys(filteredAssociations[risk]).length === 0) {
                delete filteredAssociations[risk]; // Remove the risk from associations if it's empty
            } else {
                // Filter out any remaining entries that became zero after trimming (if any)
                Object.keys(filteredAssociations[risk]).forEach(otherRisk => {
                    if (filteredAssociations[risk][otherRisk] === 0) {
                        delete filteredAssociations[risk][otherRisk];
                    }
                });
            }
        });
        return filteredAssociations;
    }
    const adjustedRiskRiskAssociations = trimDecimalsAndRemoveZeros(riskRiskAssociations);
    riskRiskAssociations = adjustedRiskRiskAssociations;
    console.log(Date.now(), ` processRiskFileData: 5. Writing the adjusted riskRiskAssociations to JSON`, riskRiskAssociations);
    updateProgress("5. Writing the adjusted riskRiskAssociations");

    //////// Update global riskRiskPercentages array, convert the counts to percentages to be used for tableData2
    const totalAssociations = Object.values(riskRiskAssociations).flatMap(obj => Object.values(obj)).reduce((a, b) => a + b, 0);
    console.log(Date.now(), " processRiskFileData: 6B. totalAssociations=", totalAssociations);
    updateProgress("6B. totalAssociations");

    Object.keys(riskRiskAssociations).forEach(risk => {
        riskRiskPercentages[risk] = {};
        Object.keys(riskRiskAssociations[risk]).forEach(otherRisk => {
            riskRiskPercentages[risk][otherRisk] = (riskRiskAssociations[risk][otherRisk] / totalAssociations) * 100;
            //riskRiskPercentages[risk][otherRisk] = (riskRiskAssociations[risk][otherRisk] / allPH.length) * 100;
        });
    });
    //console.log(Date.now(), " processRiskFileData: 6B. riskRiskPercentages=", riskRiskPercentages);
    
    
    //////// Create the main array listing all Risks and their total weight to populate top top tableData1
    // Step 7: For each Risk, get a sum count for how many documents that Risk is used in
    let riskOccurrences = {};
    Object.values(projectRisks).forEach(risksInProject => {
        const uniqueRisks = new Set(risksInProject); // Use a Set to ensure we're working with unique risks within this project
        uniqueRisks.forEach(risk => {
            if (!riskOccurrences[risk]) {riskOccurrences[risk] = 0;}
            riskOccurrences[risk] += 1; // Increment because this risk appears in another unique project
        });
    });

    // Step 8: Calculate Total Count of all projects
    let totalCount = allPH.length;  // to be replaced by totalprojects
     console.log(Date.now(), " processRiskFileData: totalCount of projectHash's=", totalCount);
     updateProgress("8. totalCount of projectHash");

    // Step 9: Calculate Weights for dataTable1
    Object.keys(riskOccurrences).forEach(risk => {
        riskWeights[risk] = (riskOccurrences[risk] * 100/ totalCount).toFixed(4); // Rounded to 4 decimal places  
        //console.log(Date.now(), ` processRiskFileData: risk=`, risk, `riskOccurrences=`, riskOccurrences[risk], `totalCount=`, totalCount, `riskWeights=`, riskWeights[risk]);  
    });

    // Step 10: Create the Array for dataTable1
    riskWeightsArray = Object.entries(riskWeights).map(([risk, weight]) => ({
        risk: risk,
        weight: parseFloat(weight) // Converting string back to number
    }));

    //console.log(Date.now(), ` processRiskFileData: =========================   riskWeightsArray=`, riskWeightsArray);
    buildTable(riskWeightsArray);  // aka dataTable1
    //updateProgress("Done");
}






/////// populate tableData2 when riskName in tableData1 is clicked on
function getAssociatedRisksFormatted(riskName) {
    console.log(Date.now(), ` getAssociatedRisksFormatted: looking for riskName=`, riskName); 

    // Retrieve the associated risks and their percentages for the given riskName
    const associatedRisks = riskRiskPercentages[riskName];
    //console.log(Date.now(), `getAssociatedRisksFormatted associatedRisks=`, associatedRisks);
    const associatedRisksArray = Object.entries(associatedRisks).map(([otherRisk, percentage]) => {
        // for each associated Risk, divide the RiskRisk percentage by the associated Risk's original doc %
        const weight = riskWeights[otherRisk] //|| 1; // Default to 1 to avoid division by 0 or undefined behavior
        //console.log(Date.now(), `getAssociatedRisksFormatted otherRisk=`, otherRisk, ` weight=`, weight);
        const adjustedPercentage = Math.abs(parseFloat((percentage * Math.log(weight)).toFixed(4))); // Adjust the percentage using the associated risk's weight
        //const adjustedPercentage = Math.abs(parseFloat((weight /percentage).toFixed(4))); 
        return {
            riskName: otherRisk,
            percentage: adjustedPercentage
        };
    });

    console.log(Date.now(), ` getAssociatedRisksFormatted associatedRisksArray.length=`, associatedRisksArray.length);
  
    // Sort the associated risks by their percentage in descending order
    associatedRisksArray.sort((a, b) => b.percentage - a.percentage);
    //console.log(Date.now(), `getAssociatedRisksFormatted sorted associatedRisksArray=`, associatedRisksArray);
  
    return associatedRisksArray;
  }
  

