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
            score = parseInt(score.trim());
            if( idx[key][difficulty].score < score ) {
                idx[key][difficulty].score = score;
                idx[key][difficulty].time = time;
            }
        },
        get: function(name) {
            return idx[escape(name)];
        },
        filter: function(filter) {
            for( var i in idx ) {
                if( filter.call(this, idx[i]) ) {
                    delete(idx[i]);
                }
            }
        },
        forEach: function(func, order) {
            var sorted = [];
            for( var i in idx ) {
                sorted.push(idx[i]);
            }

            if( order ) {
                sorted.sort(order);
            }

            for( var i in sorted ) {
                func.call(this, this.get(sorted[i].name));
            }
        }
    }
})();

var Sorter = (function() {
    var methods = [
        {domain:'name', method:'name', obj:['name']},
        {domain:'bsc', method:'level', obj:['BASIC', 'level']},
        {domain:'bsc', method:'score', obj:['BASIC', 'score'], desc: true},
        {domain:'bsc', method:'time', obj:['BASIC', 'time'], desc: true},
        {domain:'adv', method:'level', obj:['ADVANCED', 'level']},
        {domain:'adv', method:'score', obj:['ADVANCED', 'score'], desc: true},
        {domain:'adv', method:'time', obj:['ADVANCED', 'time'], desc: true},
        {domain:'ext', method:'level', obj:['EXTREME', 'level']},
        {domain:'ext', method:'score', obj:['EXTREME', 'score'], desc: true},
        {domain:'ext', method:'time', obj:['EXTREME', 'time'], desc: true}
    ];

    var current = null;
    var asc = true;

    var select = function(m) {
        if( current == m ) {
            if( asc = !asc ) $('.sorter .on').removeClass('desc').addClass('asc');
            else $('.sorter .on').removeClass('asc').addClass('desc');
            return;
        }
        current = m;
        $('.sorter .on').removeClass('on').removeClass('desc').removeClass('asc');
        $('.' + m.domain + ' .' + m.method).addClass('on').addClass('asc');
        if( asc = !m.desc ) $('.sorter .on').removeClass('desc').addClass('asc');
        else $('.sorter .on').removeClass('asc').addClass('desc');
    }
    select(methods[0]);

    var self = {
        bind: function() {
            for( var i in methods ) {
                var method = methods[i];
                $('.' + method.domain + ' .' + method.method)
                    .click((function(self, method) {
                        return function(event) {
                            event.preventDefault();
                            self.select(method);
                        }
                    })(self, method));
            }
        },
        select: function(method) {
            select(method);
            clearRows();
            addRows();
        },
        getMethod: function() {
            return function(a, b) {
                var da = a, db = b;
                for( var i in current.obj ) {
                    da = da[current.obj[i]];
                    db = db[current.obj[i]];
                }
                return (da < db ? -1 : 1) * (asc?1:-1);
            }
        }
    }

    return self;
})();

function bindHandler() {
    $('.search-query').click(function(event) {
        event.preventDefault();
    });

    $('button[name=button-refresh]').click(function(event) {
        $.post('refresh.php', {random: Math.random(), rival_id: rivalID}, function(data) {
            if( data < 0 ) {
                alert(data);
                return;
            }
            alert("Success " + data);
            getData();
        }, 'text');
    });

    Sorter.bind();
}

function updateEntry(entry) {
    var levels = {
        BASIC: parseInt(entry[3]),
        ADVANCED: parseInt(entry[4]),
        EXTREME: parseInt(entry[5])
    }, notes = {
        BASIC: parseInt(entry[6]),
        ADVANCED: parseInt(entry[7]),
        EXTREME: parseInt(entry[8])
    }
    MusicEntries.setEntry(entry[0], entry[1], entry[2], levels, notes);
}

function updateHistory(history) {
    MusicEntries.setHistory(history.music, history.difficulty, history.score, history.date);
}

function addRows() {
    MusicEntries.filter(function(e) { return e.BASIC.level == 0; });
    MusicEntries.forEach(addRow, Sorter.getMethod());
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
        var rating = null;
        if( rank < 500000 ) { rank = 0; rating = 'E'; }
        else if( rank < 700000 ) { rank = 1; rating = 'D'; }
        else if( rank < 800000 ) { rank = 2; rating = 'C'; }
        else if( rank < 850000 ) { rank = 3; rating = 'B'; }
        else if( rank < 900000 ) { rank = 4; rating = 'A'; }
        else if( rank < 950000 ) { rank = 5; rating = 'S'; }
        else if( rank < 980000 ) { rank = 6; rating = 'SS'; }
        else if( rank < 1000000 ) { rank = 7; rating = 'SSS'; }
        else { rank = 8; rating = 'EXC'; }
        html += '<div class="rank"><img src="images/rating_'+rank+'.gif" data="'+rating+'" /></div>';
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

function formatMusicInfo(entry) {
    var bpmlabel = 'BPM ';
    var bpm = entry.bpm;
    var delim = ' / ';
    var nclabel = '노트 수 ';
    var bscnc = '<span class="color-bsc-darken">' + entry.BASIC.note + '</span>';
    var advnc = '<span class="color-adv-darken">' + entry.ADVANCED.note + '</span>';
    var extnc = '<span class="color-ext-darken">' + entry.EXTREME.note + '</span>';
    var ncdelim = '-';
    return bpmlabel + bpm + delim + nclabel + bscnc + ncdelim + advnc + ncdelim + extnc;
}

function addRow(entry) {
    var tr = $('<tr class="entry">');
    var musicName = $('<td class="music">').html(formatMusicName(entry));
    var bsc = $('<td class="bsc">')
        .html(formatScore(entry.BASIC))
        .find('.level').addClass('color-bsc-darken').end()
        .addClass((entry.BASIC.score==1000000)?'fc':'nfc');
    var adv = $('<td class="adv">')
        .html(formatScore(entry.ADVANCED))
        .find('.level').addClass('color-adv-darken').end()
        .addClass((entry.ADVANCED.score==1000000)?'fc':'nfc');
    var ext = $('<td class="ext">')
        .html(formatScore(entry.EXTREME))
        .find('.level').addClass('color-ext-darken').end()
        .addClass((entry.EXTREME.score==1000000)?'fc':'nfc');
    tr.append(musicName).append(bsc).append(adv).append(ext);

    var trinfo = $('<tr class="entry-info">');
    musicName = $('<td class="music">')
        .html(formatMusicInfo(entry));
    bsc = $('<td class="bsc">').html(entry.BASIC.time.split(' ')[0]);
    adv = $('<td class="adv">').html(entry.ADVANCED.time.split(' ')[0]);
    ext = $('<td class="ext">').html(entry.EXTREME.time.split(' ')[0]);
    trinfo.append(musicName).append(bsc).append(adv).append(ext);

    $('.records .table').append(tr).append(trinfo);
}

function clearRows() {
    $('.records .table tbody tr').remove();
}

function getData() {
    // chain methods
    var methods = [getMusicData, getUserData, getStat];
    (function chain(methods) {
        if( methods.length == 0 ) return;
        var method = methods.shift();
        method.call(this, function() {
            chain(methods);
        });
    })(methods);
}

var rivalID = 57710029431862;

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
    $.get('data/'+rivalID+'.js', {r: Math.random()}, function(data) {
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

function readHash() {
    if( location.hash ) rivalID = location.hash.substr(1);
}

function getStat(callback) {
    $('.content-page.stats table').remove();

    var data = {};

    $('.fc,.nfc').each(function() {
        var lv = $(this).find('.level').text();
        var rating = $(this).find('img').attr('data');
        if( 'undefined' == typeof rating ) rating = 'NP';
        if( 'undefined' == typeof data[lv] ) data[lv] = {scoresum:0,count:0};
        if( 'undefined' == typeof data[lv][rating] ) data[lv][rating] = 0;
        data[lv][rating]++;
        
        var score = parseInt($(this).find('.score').text().replace(/,/g, ''));
        data[lv].scoresum += isNaN(score)?0:score;
        if( !isNaN(score) ) data[lv].count++;
    });

    var tbl = $('<table class="table">');
    var head = $('<tr>')
        .append($('<th>').text('레벨'))
        .append($('<th>').text('EXC'))
        .append($('<th>').text('SSS'))
        .append($('<th>').text('SS'))
        .append($('<th>').text('S'))
        .append($('<th>').text('A'))
        .append($('<th>').text('B'))
        .append($('<th>').text('C'))
        .append($('<th>').text('D'))
        .append($('<th>').text('E'))
        .append($('<th>').text('NP'))
        .append($('<th>').text('평균'));
    tbl.append(head);

    for( var i in data ) {
        var tr = $('<tr>');
        tr.append($('<th>').text('Level ' + i));
        tr.append($('<td>').text(data[i]['EXC']));
        tr.append($('<td>').text(data[i]['SSS']));
        tr.append($('<td>').text(data[i]['SS']));
        tr.append($('<td>').text(data[i]['S']));
        tr.append($('<td>').text(data[i]['A']));
        tr.append($('<td>').text(data[i]['B']));
        tr.append($('<td>').text(data[i]['C']));
        tr.append($('<td>').text(data[i]['D']));
        tr.append($('<td>').text(data[i]['E']));
        tr.append($('<td>').text(data[i]['NP']));
        tr.append($('<td>').text(parseInt(data[i]['scoresum']/(data[i]['count']?data[i]['count']:1))));
        tbl.append(tr);
    }

    $('.content-page.stats').append(tbl);

    if( callback ) {
        callback.call(this);
    }
}

function initialize() {
    bindHandler();
    readHash();
    getData();
}


