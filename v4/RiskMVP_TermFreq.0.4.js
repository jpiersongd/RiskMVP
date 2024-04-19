//Globals
let riskWeightsArray = [];
const riskRiskPercentages = {};
let allPH = {};
let allRisks = {};
let riskWeights = {};

function processRiskFileData (csvData) {
    console.log(Date.now(), " processRiskFileData: Starting the IDA-Risk process");
    //console.log(Date.now(), ` processRiskFileData: csvData=`, csvData);
    records = csvData;
    console.log(Date.now(), ` processRiskFileData: 1. Writing records.length`, records.length);
    
    //////// Build Project_Risk array
    const projectRisks = {};
    records.forEach(record => {
        if (!projectRisks[record.ProjectHash]) {projectRisks[record.ProjectHash] = [];}
        projectRisks[record.ProjectHash].push(record['RiskName']);
    });
    console.log(Date.now(), ` processRiskFileData: 2. Writing projectRisks.length`, projectRisks.length);
    
    //////// Create a count of all unique Risks and Projects
    allRisks = [...new Set(records.map(record => record.RiskName))]; // Unique list of all risks
    allPH = [...new Set(records.map(record => record.ProjectHash))]; // Unique list of all ProjectHashes
    console.log(Date.now(), " processRiskFileData: 2B. count of unique Risks = ", allRisks.length, `unique ProjectHashes=`, allPH.length);

    //////// Convert project_risks to a 2D array with binary values
    const projectHashRisk2D = {};
    Object.keys(projectRisks).forEach(projectHash => {
        projectHashRisk2D[projectHash] = allRisks.map(risk => projectRisks[projectHash].includes(risk) ? 1 : 0);
    });
    console.log(Date.now(), " processRiskFileData: 3. Writing the ProjectHash_Risk 2D array to a JSON length=", projectHashRisk2D.length);

    
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
 
    
    //////// convert the counts to percentages
    const totalAssociations = Object.values(riskRiskAssociations).flatMap(obj => Object.values(obj)).reduce((a, b) => a + b, 0);
    console.log(Date.now(), " processRiskFileData: 6B. totalAssociations=", totalAssociations);

    Object.keys(riskRiskAssociations).forEach(risk => {
        riskRiskPercentages[risk] = {};
        Object.keys(riskRiskAssociations[risk]).forEach(otherRisk => {
            riskRiskPercentages[risk][otherRisk] = (riskRiskAssociations[risk][otherRisk] / totalAssociations) * 100;
            //riskRiskPercentages[risk][otherRisk] = (riskRiskAssociations[risk][otherRisk] / allPH.length) * 100;
        });
    });
    //console.log(Date.now(), " processRiskFileData: 6B. riskRiskPercentages=", riskRiskPercentages);
    
    
    //////// Create the main array listing all Risks and their total weight to populate top top tableData 
    
    // Step 1: Get a sum count for how many documents each risk is used in
    let riskOccurrences = {};
    // Assuming projectRisks structure where each key is a projectHash and each value is an array of risks for that project
    Object.values(projectRisks).forEach(risksInProject => {
        const uniqueRisks = new Set(risksInProject); // Use a Set to ensure we're working with unique risks within this project
        uniqueRisks.forEach(risk => {
            if (!riskOccurrences[risk]) {riskOccurrences[risk] = 0;}
            riskOccurrences[risk] += 1; // Increment because this risk appears in another unique project
        });
    });

    // Step 2: Calculate Total Count of all projects
    let totalCount = allPH.length;
    console.log(Date.now(), " processRiskFileData: totalCount of projectHash's=", totalCount);
    // Step 3: Calculate Weights
    Object.keys(riskOccurrences).forEach(risk => {
        riskWeights[risk] = (riskOccurrences[risk] * 100/ totalCount).toFixed(4); // Rounded to 4 decimal places  
        //console.log(Date.now(), ` processRiskFileData: risk=`, risk, `riskOccurrences=`, riskOccurrences[risk], `totalCount=`, totalCount, `riskWeights=`, riskWeights[risk]);  
    });
    // Step 4: Create the Array
    riskWeightsArray = Object.entries(riskWeights).map(([risk, weight]) => ({
        risk: risk,
        weight: parseFloat(weight) // Converting string back to number
    }));

/*     // get object with the associated risk's weights, now doc%
    riskWeights = riskWeightsArray.reduce((acc, {risk, weight}) => {
        acc[risk] = weight;
        return acc;
    }, {});
    console.log(Date.now(), ` processRiskFileData: riskWeights=`, riskWeights);  */

    //console.log(Date.now(), ` processRiskFileData: =========================   riskWeightsArray=`, riskWeightsArray);
    buildTable(riskWeightsArray);
    updateProgress(0, 0, "Done");
}






/////// populate tableData2 when tableData1 is clicked on
function getAssociatedRisksFormatted(riskName) {
    console.log(Date.now(), ` getAssociatedRisksFormatted: looking for riskName=`, riskName); 

/*     // get object with the associated risks's weights, now doc%
    let riskWeights = riskWeightsArray.reduce((acc, {risk, weight}) => {
        acc[risk] = weight;
        return acc;
    }, {});
    console.log(Date.now(), ` getAssociatedRisksFormatted: riskWeights=`, riskWeights);  */
    
    // Retrieve the associated risks and their percentages for the given riskName
    const associatedRisks = riskRiskPercentages[riskName];
    //console.log(Date.now(), `getAssociatedRisksFormatted associatedRisks=`, associatedRisks);
    const associatedRisksArray = Object.entries(associatedRisks).map(([otherRisk, percentage]) => {
        // Use the other Risk's weight from riskWeights object; 
        const weight = riskWeights[otherRisk] || 1; // Default to 1 to avoid division by 0 or undefined behavior
        const adjustedPercentage = Math.abs(parseFloat((percentage * Math.log(weight)).toFixed(4))); // Adjust the percentage using the associated risk's weight
        //const adjustedPercentage = Math.abs(parseFloat((percentage / weight).toFixed(4)));
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
  
