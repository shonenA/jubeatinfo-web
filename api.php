<?php

require_once "_config.php";

interface Model {
    function get($data);
    function set($data);
    function del($data);
}

abstract class DefaultModel implements Model {
    abstract function get($data);
    abstract function set($data);
    abstract function del($data);
}

class JubeatinfoModel extends DefaultModel {
    protected $db;

    public function __construct() {
    }

    private function loadRivalIds() {
        $rivalIdUnparsed = file_get_contents(JUBEATINFO_DATA . '/rival_id');
        $rivalIdUnparsed = array_filter(explode("\n", $rivalIdUnparsed));
        $rivalId = array();
        foreach( $rivalIdUnparsed as $line ) {
            list($name, $id) = explode("\t", $line);
            $rivalId[$name] = $id;
        }
        return $rivalId;
    }

    public function get($data) {
        $ret = array('result' => 0);
        $username = strtolower($data['name']);

        if( empty($username) ) {
            $ret['error'] = '입력좀 --';
            return $ret;
        }

        if( preg_match('/[^a-z^0-9^\.^\-^\_^\*]/', $username) ) {
            $ret['error'] = '똑바로 입력좀 --';
            return $ret;
        }

        // get rival_id
        $rivalId = $this->loadRivalIds();
        if( !isset($rivalId[$username]) ) {
            $ret['error'] = '등록된 사용자가 아닙니다';
            return $ret;
        }

        // get latest data
        $summaryPath = JUBEATINFO_DATA . '/summary/' . $rivalId[$username];
        if( !is_dir($summaryPath) ) {
            $ret['error'] = '데이터가 ㅇ벗다';
            return $ret;
        }

        $dir = opendir($summaryPath);
        $latest = null;
        while( false !== ($entry = readdir($dir)) ) {
            if( $entry == '.' || $entry == '..' ) continue;
            $dataPath = $summaryPath . '/' . $entry;
            if( !is_file($dataPath) ) continue;
            if( !$latest || $latest < $dataPath ) {
                $latest = $dataPath;
            }
        }
        closedir($dir);

        if( !$latest ) {
            $ret['error'] = '데이터가 ㅇ벗다';
            return $ret;
        }

        $ret['result'] = 1;
        $ret['data'] = json_decode(file_get_contents($latest));
        $ret['data']->refresh = date('Y-m-d H:i:s', filemtime($latest));

        $query = <<<SQL
        SELECT music, difficulty, MAX(score) AS score,
            MAX(fc) AS fc, MAX(date) AS date
        FROM summary
        WHERE rivalid = {$rivalId[$username]}
        GROUP BY rivalid, music, difficulty
SQL;
        $ret['data']->history = array();
        $db = new SQLite3(JUBEATINFO_DATA . '/jubeatinfo.sqlite3');
        $result = $db->query($query);
        while($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $obj = new stdClass();
            $obj->music = $row['music'];
            $obj->difficulty = $row['difficulty'];
            $obj->score = $row['score'];
            $obj->fc = $row['fc'];
            $obj->date = $row['date'];
            array_push($ret['data']->history, $obj);
        }

        do {
            if( !$data['music_detail'] ) {
                break;
            }

            $rawMusicList = 'data/list.txt';
            $rawMusicList = file_get_contents($rawMusicList);
            if( empty($rawMusicList) ) {
                break;
            }

            $rawMusicList = explode("\n", $rawMusicList);
            if( empty($rawMusicList) ) {
                break;
            }

            $musicList = array();
            foreach( $rawMusicList as $music ) {
                $elem = explode("\t", $music);
                $musicList[$elem[0]] = $elem;
            }

            $history = array();
            foreach( $ret['data']->history as $music ) {
                if( empty($musicList[$music->music]) ) continue;
                $music->artist = $musicList[$music->music][1];
                $music->bpm = $musicList[$music->music][2];
                $music->score = $music->score=='-'?0:$music->score;
                switch($music->difficulty) {
                    case "BASIC":
                        $music->level = $musicList[$music->music][3];
                        $music->notecount = $musicList[$music->music][6];
                        break;
                    case "ADVANCED":
                        $music->level = $musicList[$music->music][4];
                        $music->notecount = $musicList[$music->music][7];
                        break;
                    case "EXTREME":
                        $music->level = $musicList[$music->music][5];
                        $music->notecount = $musicList[$music->music][8];
                        break;
                    default:
                        break;
                }
                array_push($history, $music);
            }
            $ret['data']->history = $history;
        } while(false);

        return $ret;
    }

    public function set($data) {
        $ret = 0;
        $username = strtolower($data['name']);

        if( empty($username) ) {
            return $ret;
        }

        if( preg_match('/[^a-z^0-9^\.^\-^\_^\*]/', $username) ) {
            return $ret;
        }

        $rivalIds = $this->loadRivalIds();
        if( !isset($rivalIds[$username]) ) {
            return $ret;
        }
        $rivalid = $rivalIds[$username];

        $queuePath = JUBEATINFO_DATA . '/queue';
        if( !is_file($queuePath) ) {
            return $ret;
        }
        $queue = file_get_contents($queuePath);
        $queue = array_filter(explode("\n", $queue));
        if( in_array($rivalid, $queue) ) {
            return $ret;
        }

        array_push($queue, $rivalid);
        $ret = (false !== file_put_contents($queuePath, implode("\n", $queue)));

        return $ret ? 1 : 0;
    }

    public function del($data) {
    }
}

interface Handler {
    function setModel($model);
    function handle($request);
}

abstract class DefaultHandler implements Handler {
    protected $model;

    public function setModel($model) {
        $this->model = $model;
    }

    abstract public function handle($request);
}

class GetHandler extends DefaultHandler {
    public function handle($request) {
        header('Content-Type: application/json');
        return json_encode($this->model->get($request));
    }
}

class PutHandler extends DefaultHandler {
    public function handle($request) {
        return $this->model->set($request);
    }
}

function handleError($errorCode) {
    echo $errorCode;
    return $errorCode;
}

function handleRequest() {
    if( !isset($_SERVER['REQUEST_METHOD']) ) {
        return handleError("Not in apache");
    }

    $method = strtolower($_SERVER['REQUEST_METHOD']);

    $handler = null;
    $request = null;
    switch($method) {
        case "put":
            if( !class_exists('PutHandler') ) break;
            $handler = new PutHandler();
            parse_str(file_get_contents("php://input"), $request);
            break;
        case "delete":
            if( !class_exists('DeleteHandler') ) break;
            $handler = new DeleteHandler();
            parse_str(file_get_contents("php://input"), $request);
            break;
        case "post":
            if( !class_exists('PostHandler') ) break;
            $handler = new PostHandler();
            $request = $_POST;
            break;
        case "get":
            if( !class_exists('GetHandler') ) break;
            $handler = new GetHandler();
            $request = $_GET;
            break;
        default:
            break;
    }

    if( !$handler ) return handleError(404);

    $handler->setModel(new JubeatinfoModel());
    $result = $handler->handle($request);

    return $result;
}

echo handleRequest();

