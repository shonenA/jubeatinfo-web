<?php

if(count($argv) < 2) {
    echo "Usage: php {$argv[0]} [Rival ID]\n";
    exit;
}

function get($string) {
    echo $string . "\n";
    return file_get_contents($string);
}

$userid = $argv[1];

$url = 'http://laika.redfeel.net:4416/user/%s/history/page/%s';
$firstpage = sprintf($url, $userid, 1);

$j = json_decode(get($firstpage));

$totalpage = ceil($j->total / $j->perpage);

$history = $j->history;

for($i = 2; $i <= $totalpage; $i++) {
    $j = json_decode(get(sprintf($url, $userid, $i)));
    $history = array_merge($history, $j->history);
}

$j->history = $history;

file_put_contents("$userid.js", json_encode($j));

