class CanvasObject {
    constructor(obj) {
        this.name = obj.name;
        this.ctx = obj.ctx;
        this.size = obj.size;
        this.origin = obj.origin;
        this.column = obj.column;
        this.max_columns = obj.max_columns;
    }

    setDomCanvasSize(domCanvas) {
        domCanvas.height = this.size.height;
        domCanvas.width = this.size.width;
    }

    groupUnits(units) {
        let groups = [...Array(this.max_columns)].map(e => Array());
    
        let that = this;
        // recursively find a placement for the breaker
        function findPlacement(unit, column_idx) {
            let heightSum = groups[column_idx].map(a => a.height);
            let potentialCombinedHeight = sum(heightSum.concat(unit.height))
            if (potentialCombinedHeight <= that.column.limit) {
                groups[column_idx].push(unit);
            } else { // no space
                if (column_idx == groups.length - 1) { // last group
                    return; // stop recursion
                }
    
                findPlacement(unit, column_idx + 1)
            }
        }
    
        // find placement starting with the biggest sizes
        for (let i = units.length - 1; i >= 0; i--) {
            findPlacement(units[i], 0);
        }
    
        // sort each column in desc order
        for (let i = 0; i < groups.length; i++) {
            groups[i] = groups[i].sort(function (a, b) { return b.height - a.height })
        }
    
        // sort all column in desc order by first unit size
        groups = groups.sort(function (a, b) {
            if (a.length != 0 && b.length != 0) // handle empty groups
                return b[0].height - a[0].height 
        });
    
        console.log(groups);
    
        return groups;
    }

    drawBreakers(blocks, blockText = 'height') {
        const { ctx, column, origin } = this;
        const vertical_spacing = 2;
    
        // tested scaling factor: 8.9 for limit=1800, 13.4 for limit=2700, 17.8 for limit=3600
        // plug into desmos to find y=mx+c lol
        const m = 0.00494444
        const c = 1 / 60;
        const scaling_factor = m * column.limit + c;
    
        const currentPos = { x: origin.x, y: origin.y }; // copy by value, not reference
    
        for (let col = 0; col < blocks.length; col++) { // iterate each column
    
            if (blocks[col].length > 0){ // skip everything if column is empty
                if (col > 0){
                    currentPos.x += blocks[col-1][0].width + column.spacing;
                }
                currentPos.y = 0;
    
                for (let j = 0; j < blocks[col].length; j++) { // iterate each unit within the column
                    
                    const block_height = blocks[col][j].height / scaling_factor - vertical_spacing;
    
                    // draw the unit
                    ctx.fillStyle = "rgba(255,0,0,0.5)";
                    ctx.fillRect(currentPos.x, currentPos.y, blocks[col][j].width, block_height);
    
                    // write centered text
                    let textToUse = '';
                    if (blockText == 'height') {
                        textToUse = String(blocks[col][j].height);
                    } else if (blockText == 'width') {
                        textToUse = String(blocks[col][j].width)*10;
                    }
                    ctx.fillStyle = "black";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.font = "16px Arial";
                    ctx.fillText(textToUse, currentPos.x + (blocks[col][j].width / 2), currentPos.y + (block_height / 2));
                    
                    currentPos.y += block_height + vertical_spacing; // start the next drawing lower down
                }
            }
        }
    }    
}

// change these numbers when you want to resize
// also remember to change .canvas-container's dimensions too
const canvas_size = [
    { width: 800, height: 300 },
    { width: 800, height: 300 }
];

const breakers = [
    { name: 'bus-coupler',      height: 1800, width: 80 },
    { name: 'incoming-feeder',  height: 1800, width: 80 },
    { name: 'outgoing-feeder',  height: 1800, width: 80 },
    { name: 'mmcb-100',         height: 200, width: 60 },
    { name: 'mmcb-250',         height: 200, width: 60 },
    { name: 'mmcb-400',         height: 400, width: 60 },
    { name: 'mmcb-630',         height: 630, width: 60 },
    { name: 'mmcb-900',         height: 900, width: 60 },
    { name: 'mmcb-1200',        height: 1800, width: 80 },
    { name: 'mmcb-1600',        height: 1800, width: 80 },
]

const boards = document.getElementsByClassName('boards');

const canvas_objects = [{
    name: 'guthrie-1',
    ctx: boards[0].getContext("2d"),
    size: canvas_size[0],
    origin: { x: 10, y: 5 },
    column: { 
        limit: 1800,
        spacing: 3
    },
    max_columns: 7
}, {
    name: 'guthrie-2',
    ctx: boards[1].getContext("2d"),
    size: canvas_size[1],
    origin: { x: 10, y: 5 },
    column: { 
        limit: 1800,
        spacing: 31.5,
    },
    max_columns: 7
}]

const canvases = document.getElementsByTagName('canvas');
const estimations = []
for (let i = 0; i < canvas_objects.length; i++){
    estimations.push(new CanvasObject(canvas_objects[i]))
    estimations[i].setDomCanvasSize(canvases[i]);
}

const estimate_btn = document.getElementById('estimate-btn');
estimate_btn.addEventListener('click', function () {
    
    clearCanvases();

    const quantities = gatherUnitSelections();
    const units = countUnits(quantities);

    const blockText = document.getElementById('block-text').value.toLowerCase();

    for (let i = 0; i < estimations.length; i++) {
        const blocks = estimations[i].groupUnits(units);
        estimations[i].drawBreakers(blocks, blockText)
    }
})

function clearCanvases(){
    for (let i = 0; i < canvas_objects.length; i++) {
        const { ctx, size: board } = canvas_objects[i];
        ctx.clearRect(0, 0, board.width, board.height);
    }
}

function gatherUnitSelections(){
    const selects = document.getElementsByClassName('select-position');
    let values = [];
    for (let i = 0; i < selects.length; i++) {
        values.push(parseInt(selects[i].value));
    }
    return values;
}

function countUnits(quantities) {

    // Size to be change according to breaker rating
    var units = [];

    // count the number of each unit
    for (let i = 0; i < quantities.length; i++) {
        units.push(...Array(quantities[i]).fill(breakers[i]));
    }
    return units;
}

function sum(arr, stop=arr.length) {
    arr = arr.slice(0, stop)
    return arr.reduce((a, b) => a + b, 0);
}