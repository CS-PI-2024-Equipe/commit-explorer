document.getElementById('commit-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const repoLink = document.getElementById('repo-link').value;
    const token = document.getElementById('token').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;


    const repoInfo = repoLink.replace('https://github.com/', '').split('/');
    const repoOwner = repoInfo[0];
    const repoName = repoInfo[1];

    const commitsContainer = document.getElementById('commits-container');
    commitsContainer.innerHTML = '';

 
    const statusElement = document.createElement('p');
    statusElement.textContent = 'Fetching commits... Please wait.';
    commitsContainer.appendChild(statusElement);

    const branchesUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/branches`;

    fetch(branchesUrl, {
        headers: {
            'Authorization': `token ${token}`
        }
    })
    .then(response => response.json())
    .then(branches => {
        const allCommits = {};
        const commitCounts = {};

        const fetchCommitsForBranch = (branch) => {
            const branchName = branch.name;
            const url = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=${branchName}&since=${startDate}T00:00:00Z&until=${endDate}T23:59:59Z`;

            return fetch(url, {
                headers: {
                    'Authorization': `token ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                data.forEach(commit => {
                    const authorName = commit.commit.author.name;

                    
                    if (!allCommits[authorName]) {
                        allCommits[authorName] = [];
                    }

                    allCommits[authorName].push({
                        message: commit.commit.message,
                        date: commit.commit.author.date,
                        branch: branchName,
                        url: commit.html_url
                    });

                  
                    if (commitCounts[authorName]) {
                        commitCounts[authorName]++;
                    } else {
                        commitCounts[authorName] = 1;
                    }
                });
            });
        };

       
        const commitPromises = branches.map(fetchCommitsForBranch);

        Promise.all(commitPromises).then(() => {
            commitsContainer.innerHTML = ''; // Limpa o status de busca

            if (Object.keys(allCommits).length === 0) {
                commitsContainer.innerHTML = '<p>No commits found for this period across all branches.</p>';
            } else {
                // resumo e commits por dev
                for (const [author, commits] of Object.entries(allCommits)) {
                    const devElement = document.createElement('div');
                    devElement.className = 'developer-section';
                    devElement.innerHTML = `<h3>Commits by ${author}</h3>`;

                    commits.forEach(commit => {
                        const commitElement = document.createElement('div');
                        commitElement.className = 'commit';
                        commitElement.innerHTML = `
                            <p><strong>Branch:</strong> ${commit.branch}</p>
                            <p><strong>Message:</strong> ${commit.message}</p>
                            <p><strong>Date:</strong> ${new Date(commit.date).toLocaleString()}</p>
                            <p><a href="${commit.url}" target="_blank">View Commit on GitHub</a></p>
                        `;
                        devElement.appendChild(commitElement);
                    });

                    // total commits
                    const summaryItem = document.createElement('p');
                    summaryItem.innerHTML = `<strong>Total commits by ${author}:</strong> ${commitCounts[author]}`;
                    devElement.appendChild(summaryItem);

                    commitsContainer.appendChild(devElement);
                }

                // sumarização
                const finalSummaryElement = document.createElement('div');
                finalSummaryElement.className = 'final-summary';
                finalSummaryElement.innerHTML = '<h3>Final Commit Summary by Developer</h3>';

                for (const [author, count] of Object.entries(commitCounts)) {
                    const summaryItem = document.createElement('p');
                    summaryItem.innerHTML = `<strong>${author}:</strong> ${count} commit(s)`;
                    finalSummaryElement.appendChild(summaryItem);
                }

                commitsContainer.appendChild(finalSummaryElement);
            }
        });
    })
    .catch(error => {
        commitsContainer.innerHTML = '<p>Error fetching branches or commits. Please try again later.</p>';
        console.error('Error fetching branches or commits:', error);
    });
});
