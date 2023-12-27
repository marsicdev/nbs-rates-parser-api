module.exports = {
    apps: [
        {
            name: 'nbs-rates-parser-api',
            script: 'src/app.js', // Update this path to the location of your Node.js script
            watch: true,
            ignore_watch: ['node_modules'],
            instances: 1,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
