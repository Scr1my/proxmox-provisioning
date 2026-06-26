let nodeCount = 0;

const addNodeBtn = document.getElementById('add-node-btn');
const container = document.getElementById('nodes-container');
const template = document.getElementById('node-template');
const noNodesMsg = document.getElementById('no-nodes-msg');

addNodeBtn.addEventListener('click', () => {
noNodesMsg.style.display = 'none';

const clone = template.content.cloneNode(true);
const htmlString = clone.firstElementChild.outerHTML
    .replace(/__INDEX__/g, `[${nodeCount}]`)
    .replace(/__DISPLAY__/g, nodeCount + 1);

const div = document.createElement('div');
div.innerHTML = htmlString;

const nodeEl = div.firstElementChild;
nodeEl.querySelector('.remove-node-btn').addEventListener('click', () => {
        nodeEl.remove();
        if (container.querySelectorAll('.node').length === 0) {
            noNodesMsg.style.display = '';
        }
    });
    container.appendChild(nodeEl);
    nodeCount++;
});