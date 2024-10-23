document.getElementById('commit-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const repoLink = document.getElementById('repo-link').value;
    const token = document.getElementById('token').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const branchInput = document.getElementById('branch').value;

    const repoInfo = repoLink.replace('https://github.com/', '').split('/');
    const repoOwner = repoInfo[0];
    const repoName = repoInfo[1];

    const commitsContainer = document.getElementById('commits-container');
    commitsContainer.innerHTML = '';

    const statusElement = document.createElement('p');
    statusElement.textContent = 'Fetching commits... Please wait.';
    commitsContainer.appendChild(statusElement);

    // Armazena os hashes dos commits para evitar duplicações
    const uniqueCommits = new Set();

    // Função para buscar commits de uma branch específica
    const fetchCommitsForBranch = (branchName) => {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=${branchName}&since=${startDate}T00:00:00Z&until=${endDate}T23:59:59Z`;

        return fetch(url, {
            headers: {
                'Authorization': `token ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            data.forEach(commit => {
                // Usa o nome do autor em vez do login
                const authorName = commit.commit.author.name || 'Unknown';
                const commitHash = commit.sha;

                // Verifica se o commit já foi processado pelo hash
                if (!uniqueCommits.has(commitHash)) {
                    uniqueCommits.add(commitHash);

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
                }
            });
        });
    };

    const allCommits = {};
    const commitCounts = {};

    if (branchInput) {
        // Se uma branch específica foi informada, apenas ela será analisada
        fetchCommitsForBranch(branchInput).then(() => {
            processCommits(allCommits, commitCounts);
        }).catch(error => {
            commitsContainer.innerHTML = '<p>Error fetching commits for the specified branch. Please try again later.</p>';
            console.error('Error fetching commits for the branch:', error);
        });
    } else {
        // Caso não haja branch específica, busca todas as branches
        const branchesUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/branches`;

        fetch(branchesUrl, {
            headers: {
                'Authorization': `token ${token}`
            }
        })
        .then(response => response.json())
        .then(branches => {
            const commitPromises = branches.map(branch => fetchCommitsForBranch(branch.name));

            Promise.all(commitPromises).then(() => {
                processCommits(allCommits, commitCounts);
            });
        })
        .catch(error => {
            commitsContainer.innerHTML = '<p>Error fetching branches or commits. Please try again later.</p>';
            console.error('Error fetching branches or commits:', error);
        });
    }

    // Função para processar e exibir os commits coletados
    function processCommits(allCommits, commitCounts) {
        commitsContainer.innerHTML = ''; // Limpa o status de busca

        if (Object.keys(allCommits).length === 0) {
            commitsContainer.innerHTML = '<p>No commits found for this period.</p>';
        } else {
            // Exibição dos commits por desenvolvedor
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
                        <p><strong>Date:</strong> ${new Date(commit.date).toLocaleDateString('pt-BR')}</p>
                        <p><a href="${commit.url}" target="_blank">View Commit on GitHub</a></p>
                    `;
                    devElement.appendChild(commitElement);
                });

                // Total de commits por desenvolvedor
                const summaryItem = document.createElement('p');
                summaryItem.innerHTML = `<strong>Total commits by ${author}:</strong> ${commitCounts[author]}`;
                devElement.appendChild(summaryItem);

                commitsContainer.appendChild(devElement);
            }

            // Sumarização final
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
    }
});
