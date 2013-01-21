var MusicEntry = function(name, artist) {
    return {
        name: name,
        artist: artist,
        bpm: 0,
        BASIC: {score:0, time:'', level:0, note:0},
        ADVANCED: {score:0, time:'', level:0, note:0},
        EXTREME: {score:0, time:'', level:0, note:0}
    }
}

var MusicEntries = (function() {
    var idx = {};

    return {
        setEntry: function(name, artist, bpm, levels, notes) {
            var key = escape(name);
            if( 'undefined' == typeof(idx[key]) ) {
                idx[key] = new MusicEntry(name, artist);
            }
            idx[key].bpm = bpm;
            for( var d in levels ) {
                idx[key][d].level = levels[d];
                idx[key][d].note = notes[d];
            }
        },
        setHistory: function(name, difficulty, score, time) {
            var key = escape(name);
            if( 'undefined' == typeof(idx[key]) ) {
                idx[key] = new MusicEntry(name);
            }
            score = score.trim();
            if( idx[key][difficulty].score < score ) {
                idx[key][difficulty].score = score;
                idx[key][difficulty].time = time;
            }
        },
        get: function(name) {
            return idx[escape(name)];
        },
        forEach: function(func) {
            for( var i in idx ) {
                func.call(this, idx[i]);
            }
        }
    }
})();

function bindHandler() {
    $('.search-query').click(function(event) {
        event.preventDefault();
    });
}

function updateEntry(entry) {
    var levels = {
        BASIC: entry[3],
        ADVANCED: entry[4],
        EXTREME: entry[5]
    }, notes = {
        BASIC: entry[6],
        ADVANCED: entry[7],
        EXTREME: entry[8]
    }
    MusicEntries.setEntry(entry[0], entry[1], entry[2], levels, notes);
}

function updateHistory(history) {
    MusicEntries.setHistory(history.music, history.difficulty, history.score, history.date);
}

function addRows() {
    MusicEntries.forEach(addRow);
}

function addCommas(nStr)
{
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

function formatScore(entry, rank) {
    var score = entry.score;
    if( typeof(rank) === 'undefined' ) {
        rank = score;
    }
    var html = '';
    if( 0 == rank ) {
        html += '<div class="not-played-yet">Not played yet</div>';
    } else {
        if( rank < 500000 ) rank = 0;
        else if( rank < 700000 ) rank = 1;
        else if( rank < 800000 ) rank = 2;
        else if( rank < 850000 ) rank = 3;
        else if( rank < 900000 ) rank = 4;
        else if( rank < 950000 ) rank = 5;
        else if( rank < 980000 ) rank = 6;
        else if( rank < 1000000 ) rank = 7;
        else rank = 8;
        html += '<div class="rank"><img src="images/rating_'+rank+'.gif" /></div>';
        html += '<div class="score">' + addCommas(score) + '</div>';
    }
    html += '<div class="level">' + entry.level + '</div>';
    return html;
}

function formatMusicName(entry) {
    var name = $('<div class="name">').text(entry.name);
    var artist = $('<div class="artist">').text(entry.artist);
    return name.add(artist);
}

function addRow(entry) {
    var tr = $('<tr class="entry">');
    var musicName = $('<td class="music">').html(formatMusicName(entry));
    var bsc = $('<td class="bsc">').html(formatScore(entry.BASIC)).addClass((entry.BASIC.score==1000000)?'fc':'nfc');
    var adv = $('<td class="adv">').html(formatScore(entry.ADVANCED)).addClass((entry.ADVANCED.score==1000000)?'fc':'nfc');
    var ext = $('<td class="ext">').html(formatScore(entry.EXTREME)).addClass((entry.EXTREME.score==1000000)?'fc':'nfc');
    tr.append(musicName).append(bsc).append(adv).append(ext);

    var trinfo = $('<tr class="entry-info">');
    musicName = $('<td class="music">').html('BPM ' + entry.bpm + ' / 노트 수 ' + entry.BASIC.note + '-' + entry.ADVANCED.note + '-' + entry.EXTREME.note);
    bsc = $('<td class="bsc">').html(entry.BASIC.time);
    adv = $('<td class="adv">').html(entry.ADVANCED.time);
    ext = $('<td class="ext">').html(entry.EXTREME.time);
    trinfo.append(musicName).append(bsc).append(adv).append(ext);

    $('.table').append(tr).append(trinfo);
}

function clearRows() {
    $('.table tbody tr').remove();
}


function getData() {
    getMusicData(getUserData);
}

function getMusicData(callback) {
    $.get('data/list.txt', function(data) {
        var rows = data.split('\n');

        for( var i in rows ) {
            var row = rows[i].trim();
            if( '' == row ) {
                continue;
            }
            updateEntry(row.split('\t'));
        }

        if( callback ) {
            callback.call(this);
        }
    }, 'text');
}

function getUserData(callback) {
    $.get('data/page.js', function(data) {
        $('.user-name').text(data.user_name);
        clearRows();
        for( var i in data.history ) {
            updateHistory(data.history[i]);
        }
        addRows();
        if( callback ) {
            callback.call(this);
        }
    }, 'json');
}

function initialize() {
    bindHandler();
    getData();
}


