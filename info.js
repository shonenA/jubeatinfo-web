var username = 'shonen.a';

function notifyError(message) {
    notify('error', message);
}

function notifySuccess(message) {
    notify('success', message);
}

function notify(type, message) {
    $('.alert').show().addClass('alert-' + type).find('.message').text(message);
}

var MusicEntry = function(name, artist) {
    return {
        name: name,
        artist: artist,
        bpm: 0,
        image: '',
        BASIC: {score:0, time:'', level:0, note:0, fc:0},
        ADVANCED: {score:0, time:'', level:0, note:0, fc:0},
        EXTREME: {score:0, time:'', level:0, note:0, fc:0}
    }
}

var MusicEntries = (function() {
    var idx = {};

    return {
        setEntry: function(name, artist, bpm, levels, notes, image) {
            var key = escape(name);
            if( 'undefined' == typeof(idx[key]) ) {
                idx[key] = new MusicEntry(name, artist);
            }
            idx[key].bpm = bpm;
            idx[key].image = image;
            for( var d in levels ) {
                idx[key][d].level = levels[d];
                idx[key][d].note = notes[d];
            }
        },
        setHistory: function(name, difficulty, score, time, fc) {
            var key = escape(name);
            if( 'undefined' == typeof(idx[key]) ) {
                idx[key] = new MusicEntry(name);
            }
            score = parseInt(score.trim());
            if( idx[key][difficulty].score < score ) {
                idx[key][difficulty].score = score;
                idx[key][difficulty].fc = fc;
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
        },
        clear: function() {
            idx = {};
        }
    }
})();

var Sorter = (function() {
    var methods = [
        {domain:'name', method:'name', obj:['name']},
        {domain:'name', method:'artist', obj:['artist']},
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
        $('.' + m.domain + ' .sort-' + m.method).addClass('on').addClass('asc');
        if( asc = !m.desc ) $('.sorter .on').removeClass('desc').addClass('asc');
        else $('.sorter .on').removeClass('asc').addClass('desc');
    }
    select(methods[0]);

    var self = {
        bind: function() {
            for( var i in methods ) {
                var method = methods[i];
                $('.' + method.domain + ' .sort-' + method.method)
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
            addTotalRows();
        },
        getMethod: function() {
            return function(a, b) {
                var da = a, db = b;
                for( var i in current.obj ) {
                    da = da[current.obj[i]];
                    db = db[current.obj[i]];
                }
                return (da == db ? (a.name < b.name ? -1 : 1) : (da < db ? -1 : 1)) * (asc ? 1 : -1);
            }
        }
    }

    return self;
})();

function bindHandler() {
    $('button[name=button-search]').click(function(event) {
        event.preventDefault();
        location.hash = $('.search-query').val();
        loadData();
    });

    $('button[name=button-refresh]').click(function(event) {
        event.preventDefault();
        $.ajax({
            type: 'PUT',
            url: 'api.php',
            data: {random: Math.random(), name: username},
            success: function(data) {
                if( !data ) {
                    notifyError('갱신 요청 실패');
                    return;
                }
                notifySuccess('갱신 요청이 되었습니다');
            },
            dataType: 'text'
        });
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
    MusicEntries.setEntry(entry[0], entry[1], entry[2], levels, notes, entry[9]);
}

function updateHistory(history) {
    MusicEntries.setHistory(history.music, history.difficulty, history.score, history.date, history.fc);
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

function getImage(url) {
    if( !$('.cache').length ) $('<div class="cache">').appendTo('body').css({weight:0,height:0});
    var data = $('.cache').data(url);
    if( !data ) {
        data = $('<img>').attr('src', url).appendTo('.cache');
        $('.cache').data(url, data);
    }

    return data.clone();
}

function formatMusicName(entry) {
    var image = $('<div class="image">').append($('<img>').attr('src', entry.image));
    var name = $('<div class="name">').text(entry.name);
    var artist = $('<div class="artist">').text(entry.artist);
    return image.add(name).add(artist);
}

function formatMusicInfo(entry) {
    var bpmlabel = '<span class="label-bpm">BPM</span>';
    var bpm = '<span class="value-bpm">' + entry.bpm + '</span>';
    var nclabel = '<span class="label-note">노트 수</span>';
    var bscnc = '<span class="value-note color-bsc-darken first">' + entry.BASIC.note + '</span>';
    var advnc = '<span class="value-note color-adv-darken">' + entry.ADVANCED.note + '</span>';
    var extnc = '<span class="value-note color-ext-darken">' + entry.EXTREME.note + '</span>';
    return bpmlabel + bpm + nclabel + bscnc + advnc + extnc;
}

function addRow(entry) {
    var tr = $('<tr class="entry">');
    var musicName = $('<td class="music">').html(formatMusicName(entry));
    var bsc = $('<td class="bsc">')
        .html(formatScore(entry.BASIC))
        .find('.level').addClass('color-bsc-darken').end()
        .addClass((entry.BASIC.fc)?'fc':'nfc');
    var adv = $('<td class="adv">')
        .html(formatScore(entry.ADVANCED))
        .find('.level').addClass('color-adv-darken').end()
        .addClass((entry.ADVANCED.fc)?'fc':'nfc');
    var ext = $('<td class="ext">')
        .html(formatScore(entry.EXTREME))
        .find('.level').addClass('color-ext-darken').end()
        .addClass((entry.EXTREME.fc)?'fc':'nfc');
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

function addTotalRows() {
    function getAvgScore(difficulty) {
        var scores = $('.' + difficulty + ' .score');
        var total = scores.get()
            .map(function(e) { return parseInt($(e).text().replace(/,/g, '')); })
            .reduce(function(a,b) { return a + b; });

        return parseInt(total / scores.length)
    }

    var entry = {
        BASIC: {
            score: getAvgScore('bsc'),
            date: $('.entry-info .bsc').get().map(function(e){return $(e).text()}).sort(function(a,b){return a>b?-1:1})[0],
            level: 'BSC',
        },
        ADVANCED: {
            score: getAvgScore('adv'),
            date: $('.entry-info .adv').get().map(function(e){return $(e).text()}).sort(function(a,b){return a>b?-1:1})[0],
            level: 'ADV',
        },
        EXTREME: {
            score: getAvgScore('ext'),
            date: $('.entry-info .ext').get().map(function(e){return $(e).text()}).sort(function(a,b){return a>b?-1:1})[0],
            level: 'EXT',
        }
    };

    var tr = $('<tr class="entry total">');
    var musicName = $('<td class="desc">').html('평균');
    var bsc = $('<td class="bsc">')
        .html(formatScore(entry.BASIC))
        .find('.level').addClass('color-bsc-darken').end()
        .addClass((entry.BASIC.fc)?'fc':'nfc');
    var adv = $('<td class="adv">')
        .html(formatScore(entry.ADVANCED))
        .find('.level').addClass('color-adv-darken').end()
        .addClass((entry.ADVANCED.fc)?'fc':'nfc');
    var ext = $('<td class="ext">')
        .html(formatScore(entry.EXTREME))
        .find('.level').addClass('color-ext-darken').end()
        .addClass((entry.EXTREME.fc)?'fc':'nfc');
    tr.append(musicName).append(bsc).append(adv).append(ext);

    var trinfo = $('<tr class="entry-info total">');
    musicName = $('<td class="music">').html('');
    bsc = $('<td class="bsc">').html(entry.BASIC.date);
    adv = $('<td class="adv">').html(entry.ADVANCED.date);
    ext = $('<td class="ext">').html(entry.EXTREME.date);
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

function convertFullwidthToHalfwidth(str) {
    var ret = '';
    for( var i=0; i < str.length; i++ ) {
        var code = str.charCodeAt(i);
        if( code == 0x3000 ) {
            ret += ' ';
        } else if( code >= 0xff00 && code < 0xff5f ) {
            ret += String.fromCharCode(code - 0xff00 + 0x20);
        } else {
            ret += str[i];
        }
    }
    return ret;
}

function setBasicInformation(data) {
    var jubilityTbl = [
        'stone', 'soap bubble', 'pencil', 'macaron', 'lotus', 'beetle',
        'jellyfish', 'hummingbird', 'kaleidoscope', 'prism', 'prism'
    ];

    $('.basicinfo .refresh').text('(최근 갱신: ' + data.refresh + ')');

    $('.subinfo-title').text(data.title);
    $('.subinfo-name').text(data.user_name);

    $('.subinfo-jubility').text(data.jubility).attr('description', jubilityTbl[parseInt(data.jubility)]);
    $('.subinfo-jubilityimage').text('').append($('<img>').attr('src', data.jubility_image));

    $('.subinfo-rivalid').text(data.rival_id).attr('description', '라이벌 아이디');
    $('.subinfo-activegroup').text(data.active_group).attr('description', '소속 그룹');

    $('.subinfo-marker').append($('<img>').attr('src', data.marker));
    $('.subinfo-background').append($('<img>').attr('src', data.background));

    $('.subinfo-score').text(addCommas(data.tbs_score));
    $('.subinfo-ranking').text(addCommas(data.tbs_ranking));

    $('.subinfo-time').text(data.lastplaytime).attr('description', '최근 플레이 일');
    $('.subinfo-place').text(convertFullwidthToHalfwidth(data.lastplayplace)).attr('description', '최근 플레이 장소');

    $('.subinfo-play').text(addCommas(data.count_play)).attr('description', '플레이 횟수');
    $('.subinfo-fullcombo').text(addCommas(data.count_fullcombo)).attr('description', '풀콤보 횟수');
    $('.subinfo-excellent').text(addCommas(data.count_excellent)).attr('description', '엑설런트 횟수');

    $('.link-eagate').text('e-AMUSEMENT GATE로')
            .attr('href', 'http://p.eagate.573.jp/game/jubeat/saucer/p/playdata/index_other.html?rival_id=' + data.rival_id)
            .attr('target', '_eamusementgate');
}

function getUserData(callback) {
    $.get('api.php', {name: username, r: Math.random()}, function(res) {
        if( !res.result ) {
            notifyError(res.error);
            return;
        }

        var data = res.data;

        setBasicInformation(data);
        $('.basicinfo').show();

        clearRows();
        for( var i in data.history ) {
            updateHistory(data.history[i]);
        }
        addRows();
        addTotalRows();
        $('.records').show();

        if( callback ) {
            callback.call(this);
        }
    }, 'json');
}

function readHash() {
    if( location.hash ) {
        username = location.hash.substr(1);
        $('.search-query').val(username);
    }
}

function getStat(callback) {
    $('.content-page.stats table').remove();

    var data = {};
    var total = {scoresum:0,count:0};

    $('.fc,.nfc').each(function() {
        var lv = $(this).find('.level').text();
        var rating = $(this).find('img').attr('data');
        if( 'undefined' == typeof rating ) rating = 'NP';
        if( 'undefined' == typeof data[lv] ) data[lv] = {scoresum:0,count:0};
        if( 'undefined' == typeof data[lv][rating] ) data[lv][rating] = 0;
        if( 'undefined' == typeof total[rating] ) total[rating] = 0;
        data[lv][rating]++;
        total[rating]++;
        
        var score = parseInt($(this).find('.score').text().replace(/,/g, ''));
        data[lv].scoresum += isNaN(score)?0:score;
        total.scoresum += isNaN(score)?0:score;
        if( !isNaN(score) ) { data[lv].count++; total.count++; }
    });

    var rankArr = ['EXC', 'SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];

    var tbl = $('<table class="table">');
    var head = $('<tr>');
    head.append($('<th>').text('레벨'));
    for( var i in rankArr ) {
        head.append($('<th>').text(rankArr[i]))
    }
    head.append($('<th>').text('NP'))
    head.append($('<th>').text('평균'));
    tbl.append(head);

    for( var i = 1; i <= 10; i++ ) {
        if( parseInt(i) != i ) continue;
        var tr = $('<tr>');
        tr.append($('<th>').text('Level ' + i));
        for( var j in rankArr ) {
            tr.append($('<td>').text(data[i][rankArr[j]]));
        }
        tr.append($('<td>').text(data[i]['NP']));
        tr.append($('<td>').text(addCommas(parseInt(data[i]['scoresum']/(data[i]['count']?data[i]['count']:1)))));
        tbl.append(tr);
    }

    var tr = $('<tr>');
    tr.append($('<th>').text('계'));
    for( var i in rankArr ) {
        tr.append($('<td>').text(total[rankArr[i]]));
    }
    tr.append($('<td>').text(total['NP']));
    tr.append($('<td>').text(addCommas(parseInt(total['scoresum']/(total['count']?total['count']:1)))));
    tbl.append(tr);


    $('.content-page.stats').append(tbl);

    $('.stats').show();

    if( callback ) {
        callback.call(this);
    }
}

function clearContents() {
    $('.alert').hide();
    $('.basicinfo,.stats,.records').hide();
    MusicEntries.clear();
}

function loadData() {
    clearContents();
    readHash();
    getData();
}

function initialize() {
    bindHandler();
    loadData();
}


