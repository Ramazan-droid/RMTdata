import fs from 'fs';

// Base URL of your app (change port to 3001 if testing Node backend directly)
const BASE_URL = 'http://localhost:8080';

async function runTest(route, modeName, totalRequests = 100, maxPages = 42) {
    let rows = [];

    console.log(`🚀 Starting experiment for route: ${route} (${totalRequests} requests)...`);

    for (let i = 1; i <= totalRequests; i++) {
        // Cyclically loop through available pages 1 to 42
        const pageNum = ((i - 1) % maxPages) + 1;
        const url = `${BASE_URL}${route}?page=${pageNum}&limit=12`;

        const startTime = Date.now();
        try {
            const response = await fetch(url);
            const duration = Date.now() - startTime;
            
            rows.push({
                run_id: i,
                mode: modeName,
                page_number: pageNum,
                response_time_ms: duration,
                status: response.status,
                timestamp: new Date().toISOString()
            });

            console.log(`[Run ${i}/${totalRequests}] Route: ${route} | Page: ${pageNum} | Time: ${duration}ms | Status: ${response.status}`);
        } catch (error) {
            console.error(`[Run ${i}] Error: ${error.message}`);
            rows.push({
                run_id: i,
                mode: modeName,
                page_number: pageNum,
                response_time_ms: -1,
                status: 'ERROR',
                timestamp: new Date().toISOString()
            });
        }
        
        // Short 50ms delay to simulate realistic browser pacing
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return rows;
}

async function main() {
    // 1. Run 100 requests for /pagination
    const paginationData = await runTest('/pagination', 'pagination', 100, 42);
    
    // 2. Run 100 requests for /infinite
    const infiniteData = await runTest('/infinite', 'infinite_scroll', 100, 42);

    // 3. Merge into unified raw CSV data
    const csvHeader = 'run_id,mode,page_number,response_time_ms,status,timestamp\n';
    const allRows = [...paginationData, ...infiniteData];
    
    const csvContent = csvHeader + allRows.map(row => 
        `${row.run_id},${row.mode},${row.page_number},${row.response_time_ms},${row.status},${row.timestamp}`
    ).join('\n');

    // Save to raw_experiment_metrics.csv
    fs.writeFileSync('raw_experiment_metrics.csv', csvContent);
    console.log('\n✅ All 200 test requests completed successfully!');
    console.log('📁 Raw data saved to "raw_experiment_metrics.csv"');
}

main();