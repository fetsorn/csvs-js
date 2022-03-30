# break-biorg.awk
# MIT License Copyright (c) 2022 Anton Davydov
#
# Reads a biorg compilation,
# breaks each node, outputs path to a temporary metadir

# json is parsed with jawk
# MIT License Copyright (c) 2020 Mohamed Akram

#######################
######## JAWK #########
#######################

function __parse_json(configpath) {
    ESCAPE="(\\\\[^u[:cntrl:]]|\\\\u[0-9a-fA-F]{4})"
    CHAR="[^[:cntrl:]\"\\\\]"
    STRING="\"" CHAR "*(" ESCAPE CHAR "*)*\""
    NUMBER="-?(0|[1-9][0-9]*)([.][0-9]*)?([eE][+-]?[0-9]*)?"
    KEYWORD="null|false|true"
    JAWKREGEX= STRING "|" NUMBER "|" KEYWORD "|[][{}:,]"

    config_cmd = "grep -E -o '" JAWKREGEX "' " configpath
    __json_length=0
    while ((config_cmd | getline config_line) > 0) {
        __json_lines[__json_length]=config_line
        __json_length++
    }
    # TODO handle if parsing of malformed json never exits
    __json_queue=0
    __parse_value(__json_lines[__json_queue])
}
function __jawk__init(i) {
    __CHAR[0] = "\0"
    __CHAR[1] = "\1"
    __CHAR[2] = "\2"
    __CHAR[3] = "\3"
    __CHAR[4] = "\4"
    __CHAR[5] = "\5"
    __CHAR[6] = "\6"
    __CHAR[7] = "\7"
    __CHAR[8] = "\10"
    __CHAR[9] = "\11"
    __CHAR[10] = "\12"
    __CHAR[11] = "\13"
    __CHAR[12] = "\14"
    __CHAR[13] = "\15"
    __CHAR[14] = "\16"
    __CHAR[15] = "\17"
    __CHAR[16] = "\20"
    __CHAR[17] = "\21"
    __CHAR[18] = "\22"
    __CHAR[19] = "\23"
    __CHAR[20] = "\24"
    __CHAR[21] = "\25"
    __CHAR[22] = "\26"
    __CHAR[23] = "\27"
    __CHAR[24] = "\30"
    __CHAR[25] = "\31"
    __CHAR[26] = "\32"
    __CHAR[27] = "\33"
    __CHAR[28] = "\34"
    __CHAR[29] = "\35"
    __CHAR[30] = "\36"
    __CHAR[31] = "\37"
    __CHAR[32] = "\40"
    __CHAR[33] = "\41"
    __CHAR[34] = "\42"
    __CHAR[35] = "\43"
    __CHAR[36] = "\44"
    __CHAR[37] = "\45"
    __CHAR[38] = "\46"
    __CHAR[39] = "\47"
    __CHAR[40] = "\50"
    __CHAR[41] = "\51"
    __CHAR[42] = "\52"
    __CHAR[43] = "\53"
    __CHAR[44] = "\54"
    __CHAR[45] = "\55"
    __CHAR[46] = "\56"
    __CHAR[47] = "\57"
    __CHAR[48] = "\60"
    __CHAR[49] = "\61"
    __CHAR[50] = "\62"
    __CHAR[51] = "\63"
    __CHAR[52] = "\64"
    __CHAR[53] = "\65"
    __CHAR[54] = "\66"
    __CHAR[55] = "\67"
    __CHAR[56] = "\70"
    __CHAR[57] = "\71"
    __CHAR[58] = "\72"
    __CHAR[59] = "\73"
    __CHAR[60] = "\74"
    __CHAR[61] = "\75"
    __CHAR[62] = "\76"
    __CHAR[63] = "\77"
    __CHAR[64] = "\100"
    __CHAR[65] = "\101"
    __CHAR[66] = "\102"
    __CHAR[67] = "\103"
    __CHAR[68] = "\104"
    __CHAR[69] = "\105"
    __CHAR[70] = "\106"
    __CHAR[71] = "\107"
    __CHAR[72] = "\110"
    __CHAR[73] = "\111"
    __CHAR[74] = "\112"
    __CHAR[75] = "\113"
    __CHAR[76] = "\114"
    __CHAR[77] = "\115"
    __CHAR[78] = "\116"
    __CHAR[79] = "\117"
    __CHAR[80] = "\120"
    __CHAR[81] = "\121"
    __CHAR[82] = "\122"
    __CHAR[83] = "\123"
    __CHAR[84] = "\124"
    __CHAR[85] = "\125"
    __CHAR[86] = "\126"
    __CHAR[87] = "\127"
    __CHAR[88] = "\130"
    __CHAR[89] = "\131"
    __CHAR[90] = "\132"
    __CHAR[91] = "\133"
    __CHAR[92] = "\134"
    __CHAR[93] = "\135"
    __CHAR[94] = "\136"
    __CHAR[95] = "\137"
    __CHAR[96] = "\140"
    __CHAR[97] = "\141"
    __CHAR[98] = "\142"
    __CHAR[99] = "\143"
    __CHAR[100] = "\144"
    __CHAR[101] = "\145"
    __CHAR[102] = "\146"
    __CHAR[103] = "\147"
    __CHAR[104] = "\150"
    __CHAR[105] = "\151"
    __CHAR[106] = "\152"
    __CHAR[107] = "\153"
    __CHAR[108] = "\154"
    __CHAR[109] = "\155"
    __CHAR[110] = "\156"
    __CHAR[111] = "\157"
    __CHAR[112] = "\160"
    __CHAR[113] = "\161"
    __CHAR[114] = "\162"
    __CHAR[115] = "\163"
    __CHAR[116] = "\164"
    __CHAR[117] = "\165"
    __CHAR[118] = "\166"
    __CHAR[119] = "\167"
    __CHAR[120] = "\170"
    __CHAR[121] = "\171"
    __CHAR[122] = "\172"
    __CHAR[123] = "\173"
    __CHAR[124] = "\174"
    __CHAR[125] = "\175"
    __CHAR[126] = "\176"
    __CHAR[127] = "\177"
    __CHAR[128] = "\200"
    __CHAR[129] = "\201"
    __CHAR[130] = "\202"
    __CHAR[131] = "\203"
    __CHAR[132] = "\204"
    __CHAR[133] = "\205"
    __CHAR[134] = "\206"
    __CHAR[135] = "\207"
    __CHAR[136] = "\210"
    __CHAR[137] = "\211"
    __CHAR[138] = "\212"
    __CHAR[139] = "\213"
    __CHAR[140] = "\214"
    __CHAR[141] = "\215"
    __CHAR[142] = "\216"
    __CHAR[143] = "\217"
    __CHAR[144] = "\220"
    __CHAR[145] = "\221"
    __CHAR[146] = "\222"
    __CHAR[147] = "\223"
    __CHAR[148] = "\224"
    __CHAR[149] = "\225"
    __CHAR[150] = "\226"
    __CHAR[151] = "\227"
    __CHAR[152] = "\230"
    __CHAR[153] = "\231"
    __CHAR[154] = "\232"
    __CHAR[155] = "\233"
    __CHAR[156] = "\234"
    __CHAR[157] = "\235"
    __CHAR[158] = "\236"
    __CHAR[159] = "\237"
    __CHAR[160] = "\240"
    __CHAR[161] = "\241"
    __CHAR[162] = "\242"
    __CHAR[163] = "\243"
    __CHAR[164] = "\244"
    __CHAR[165] = "\245"
    __CHAR[166] = "\246"
    __CHAR[167] = "\247"
    __CHAR[168] = "\250"
    __CHAR[169] = "\251"
    __CHAR[170] = "\252"
    __CHAR[171] = "\253"
    __CHAR[172] = "\254"
    __CHAR[173] = "\255"
    __CHAR[174] = "\256"
    __CHAR[175] = "\257"
    __CHAR[176] = "\260"
    __CHAR[177] = "\261"
    __CHAR[178] = "\262"
    __CHAR[179] = "\263"
    __CHAR[180] = "\264"
    __CHAR[181] = "\265"
    __CHAR[182] = "\266"
    __CHAR[183] = "\267"
    __CHAR[184] = "\270"
    __CHAR[185] = "\271"
    __CHAR[186] = "\272"
    __CHAR[187] = "\273"
    __CHAR[188] = "\274"
    __CHAR[189] = "\275"
    __CHAR[190] = "\276"
    __CHAR[191] = "\277"
    __CHAR[192] = "\300"
    __CHAR[193] = "\301"
    __CHAR[194] = "\302"
    __CHAR[195] = "\303"
    __CHAR[196] = "\304"
    __CHAR[197] = "\305"
    __CHAR[198] = "\306"
    __CHAR[199] = "\307"
    __CHAR[200] = "\310"
    __CHAR[201] = "\311"
    __CHAR[202] = "\312"
    __CHAR[203] = "\313"
    __CHAR[204] = "\314"
    __CHAR[205] = "\315"
    __CHAR[206] = "\316"
    __CHAR[207] = "\317"
    __CHAR[208] = "\320"
    __CHAR[209] = "\321"
    __CHAR[210] = "\322"
    __CHAR[211] = "\323"
    __CHAR[212] = "\324"
    __CHAR[213] = "\325"
    __CHAR[214] = "\326"
    __CHAR[215] = "\327"
    __CHAR[216] = "\330"
    __CHAR[217] = "\331"
    __CHAR[218] = "\332"
    __CHAR[219] = "\333"
    __CHAR[220] = "\334"
    __CHAR[221] = "\335"
    __CHAR[222] = "\336"
    __CHAR[223] = "\337"
    __CHAR[224] = "\340"
    __CHAR[225] = "\341"
    __CHAR[226] = "\342"
    __CHAR[227] = "\343"
    __CHAR[228] = "\344"
    __CHAR[229] = "\345"
    __CHAR[230] = "\346"
    __CHAR[231] = "\347"
    __CHAR[232] = "\350"
    __CHAR[233] = "\351"
    __CHAR[234] = "\352"
    __CHAR[235] = "\353"
    __CHAR[236] = "\354"
    __CHAR[237] = "\355"
    __CHAR[238] = "\356"
    __CHAR[239] = "\357"
    __CHAR[240] = "\360"
    __CHAR[241] = "\361"
    __CHAR[242] = "\362"
    __CHAR[243] = "\363"
    __CHAR[244] = "\364"
    __CHAR[245] = "\365"
    __CHAR[246] = "\366"
    __CHAR[247] = "\367"
    __CHAR[248] = "\370"
    __CHAR[249] = "\371"
    __CHAR[250] = "\372"
    __CHAR[251] = "\373"
    __CHAR[252] = "\374"
    __CHAR[253] = "\375"
    __CHAR[254] = "\376"
    __CHAR[255] = "\377"

    __UNESCAPE["\\b"] = "\b"
    __UNESCAPE["\\f"] = "\f"
    __UNESCAPE["\\n"] = "\n"
    __UNESCAPE["\\r"] = "\r"
    __UNESCAPE["\\t"] = "\t"
    __UNESCAPE["\\\""] = "\""
    __UNESCAPE["\\\\"] = "\\"
    __UNESCAPE["\\/"] = "/"

    for (i = 0; i < 256; i++)
        __HEX[sprintf("%02X", i)] = i
}

function __utf8enc(c) {

    # 0x007f
    if (c <= 127) {
        return __CHAR[c]
    # 0x07ff
    } else if (c <= 2047) {
        # 110xxxxx 10xxxxxx
        return __CHAR[192 + int(c/64)] __CHAR[128 + (c%64)]
    # 0xffff
    } else if (c <= 65535) {
        # 1110xxxx 10xxxxxx 10xxxxxx
        return __CHAR[224 + int(c/4096)] \
            __CHAR[128 + (int(c/64) % 64)] \
            __CHAR[128 + (c%64)]
    # 0x10ffff
    } else if (c <= 1114111) {
        # 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        return __CHAR[240 + int(c/262144)] \
            __CHAR[128 + (int(c/4096) % 64)] \
            __CHAR[128 + (int(c/64) % 64)] \
            __CHAR[128 + (c%64)]
    }
}

function __hextodec(h) {
    h = toupper(h)
    return 256 * __HEX[substr(h, 1, 2)] + __HEX[substr(h, 3)]
}

function __unescape(s, i, s2, c, u, h) {
    i = match(s, /\\([bfnrt"\\\/]|u[0-9a-fA-F]{4})/)
    if (!i) return s
    s2 = ""
    while (i) {
        c = substr(s, RSTART, RLENGTH)
        if (c in __UNESCAPE) u = __UNESCAPE[c]
        else {
            h = __hextodec(substr(c, 3))
            # high surrogate pair
            # 0xd800 - 0xdbff
            if (h >= 55296 && h <= 56319) {
                c = substr(s, RSTART + RLENGTH, 6)
                RLENGTH += 6
                h = 65536 + ((h - 55296) * 1024) + \
                    (__hextodec(substr(c, 3)) - 56320)
            }
            u = __utf8enc(h)
        }
        s2 = s2 substr(s, 1, RSTART - 1) u
        s = substr(s, RSTART + RLENGTH)
        i = match(s, /\\([bfnrt"\\\/]|u[0-9a-fA-F]{4})/)
    }
    s2 = s2 s
    return s2
}

function keys(a, o, n, i) {
    # differentiate between the root object and an empty root key
    # if the root object
    if (o == "" && o == 0) {
        # if object
        if ((__KEYS,"length") in _) {
            n = _[__KEYS,"length"]
            while (++i <= n) a[_[__KEYS,i]] = _[__KEYS,i]
        # if array
        } else {
            n = _["length"]
            while (++i <= _["length"]) a[i] = i
        }
    }
    else {
        # if object
        if ((o,__KEYS,"length") in _) {
            n = _[o,__KEYS,"length"]
            while (++i <= n) a[_[o,__KEYS,i]] = o SUBSEP _[o,__KEYS,i]
        # if array
        } else {
            n = _[o,"length"]
            while (++i <= n) a[i] = o SUBSEP i
        }
    }
    return n
}

function __parse_array(path, i, sep, raw_value, value) {
    i = 0
    sep = ""
    raw_value = "["
    while (sep != "]") {
        __json_queue++
        value=__json_lines[__json_queue]
        if (value == "]") {
            raw_value = raw_value value
            break
        }
        value = __parse_value(value, __getpath(path, ++i))
        __json_queue++
        sep=__json_lines[__json_queue]
        raw_value = raw_value value sep
    }
    _[__getpath(path, "length")] = i
    return raw_value
}

function __parse_value(value, path, raw_value, start, type) {
    start = substr(value, 1, 1)
    if (start == "{") {
        _[path] = path
        type = "object"
        raw_value = __parse_object(path)
    } else if (start == "[") {
        _[path] = path
        type = "array"
        raw_value = __parse_array(path)
    } else {
        raw_value = value
        if (start == "\"") {
            # remove surrounding quotes
            value = __unescape(substr(value, 2, length(value) - 2))
            type = "string"
        }
        else if (value == "true") {
            value = 1
            type = "boolean"
        }
        else if (value == "false") {
            value = 0
            type = "boolean"
        }
        else if (value == "null") {
            value = ""
            type = "null"
        } else {
            type = "number"
        }
        if (path == "" && path == 0)
            _[0] = value
        else
            _[path] = value
    }
    _[__getpath(path, JSON)] = raw_value
    _[__getpath(path, TYPE)] = type
    return raw_value
}

function __getpath(path, key) {
    # differentiate between the root object and an empty root key
    return path == "" && path == 0 ? key : path SUBSEP key
}

function __parse_object(path, sep, i, raw_value, key, colon, value, raw_key) {
    sep = ""
    i = 0
    raw_value = "{"
    while (sep != "}") {
        __json_queue++
        key=__json_lines[__json_queue]
        if (key == "}") {
            raw_value = raw_value key
            break
        }
        __json_queue++
        colon=__json_lines[__json_queue]
        __json_queue++
        value=__json_lines[__json_queue]
        raw_key = key
        key = substr(key, 2, length(key) - 2)
        value = __parse_value(value, __getpath(path, key))
        __json_queue++
        sep=__json_lines[__json_queue]
        raw_value = raw_value raw_key colon value sep
        ++i
        _[__getpath(path, __KEYS SUBSEP i)] = key
    }
    _[__getpath(path, __KEYS SUBSEP "length")] = i
    return raw_value
}


#######################
######## JAWK #########
#######################

function escape_json(str) {
    gsub(/\\/, "\\\\", str)
    gsub(/"/,  "\\\"", str)
    gsub(/\b/, "\\b",  str)
    gsub(/\f/, "\\f",  str)
    gsub(/\n/, "\\n",  str)
    gsub(/\r/, "\\r",  str)
    gsub(/\t/, "\\t",  str)
    gsub(/\v/, "",  str)

    return "\42" str "\42"
}
function set_uuid(prop,       prop_value_bash, prop_uuid) {

    if (parsed[prop] == 0) { return }
    prop_value_bash = values[prop]
    if (_[prop,"type"] == "string") {
        # string can contain arbitrary characters
        # so it is wrapped in single quotes when passed to bash pipes
        # escape the single quotes inside the raw string here
        gsub("'", "'\"'\"'", prop_value_bash);
    };

    if (prop == config_root) {
        # TODO does root uuid have to be hardcoded?
        prop_uuid = values["uuid"];
        # if no prop_uuid is provided, generate unique uuid
        if (prop_uuid == "") {
            prop_uuid_cmd = "uuidgen | sha256sum | cut -c 1-64";
            prop_uuid_cmd | getline prop_uuid_new;
            prop_uuid = prop_uuid_new;
            close(prop_uuid_cmd);
        }
    } else if (_[prop,"type"] == "hash") {
        prop_uuid = values[prop];
    } else {
        prop_uuid_cmd = "printf '%s' '" prop_value_bash "' | sha256sum | cut -c 1-64";
        prop_uuid_cmd | getline prop_uuid_new;
        prop_uuid = prop_uuid_new;
        close(prop_uuid_cmd);
    }
    uuids[prop]=prop_uuid;
}
function write_prop(prop, parent, parent_uuid,       prop_value_escaped, prop_dir, prop_index, prop_pair) {

    if (parsed[prop] == 0) { return }
    prop_value_escaped = values[prop];
    if (_[prop,"type"] == "string") {
        # strip trailing newlines
        # to avoid unexpected stripping later
        gsub(/\n*$/, "", prop_value_escaped);
        # escape as a json string
        prop_value_escaped = escape_json(prop_value_escaped);
    };

    if (_[prop,"type"] != "hash") {
        prop_dir = _[prop,"dir"]
        if (prop_dir == "") { prop_dir = prop }
        system("mkdir -p " temp "/props/" prop_dir)
        # write prop_uuid,prop_value to metadir/props/${prop_dir}/index.csv
        prop_index = temp "/props/" prop_dir "/index.csv";
        printf "%s,%s\n", uuids[prop], prop_value_escaped >> prop_index;
    }

    if (prop != config_root) {
        system("mkdir -p " temp "/pairs")
        # write parent_uuid,prop_uuid to metadir/pairs/datum-guestname.csv
        prop_pair = temp "/pairs/" parent "-" prop ".csv";
        printf "%s,%s\n", parent_uuid, uuids[prop] >> prop_pair;
    }
}
function write_node() {

    # get a list of props from config
    # if parent is processed, write_prop
    # otherwise push to queue

    queue=split(config_props, props)

    # set uuid for root and consider it processed
    # but do not write yet
    set_uuid(config_root)
    processed[config_root] = 1

    while (queue > 0) {
        prop = props[queue]
        parent = _[prop,"parent"]
        if (processed[prop] == 1) {
            delete props[queue]
            queue--
        } else if (processed[parent] == 1) {
            set_uuid(prop)
            write_prop(prop, parent, uuids[parent])
            processed[prop] = 1
            delete props[queue]
            queue--
        } else {
            queue++
            props[queue]=parent
        }
    }
    # write root prop
    write_prop(config_root, "", "")
}
BEGIN {
    temp_cmd = "mktemp -d"
    temp_cmd | getline temp;

    # init jawk
    JSON="\1";
    TYPE="\2";
    __KEYS="\3";
    __jawk__init();

    # TODO fallback CONFIG to pwd
    if (CONFIG == "") {
        print "No config provided" > "/dev/stderr"
        exit 1
    }
    # use jawk to parse json into an associative array _
    # to get value of key2 of object key1 call _["key1","key2"]
    __parse_json(CONFIG)

    # TODO rewrite to use the jawk array
    config_props_cmd = "jq -r 'keys | join(\" \")' " CONFIG
    config_props_cmd | getline config_props;

    # TODO rewrite to use the jawk array
    root_cmd = "jq -r 'map_values(select(has(\"parent\") | not)) | keys[0]' " CONFIG
    root_cmd | getline config_root;

    counter=0;
}
# heading line
/^\* \.$/ {
    afterheading=1
    # write previous node
    if (node==1) {
        values[config_root]=datum
        parsed[config_root]=1;
        write_node();
    }
    # remember to write node on the next heading
    node=1;
    # print the number of processed nodes
    counter++;
    printf "%s\r", counter >> "/dev/stderr";
    # delete previous node's props and datum
    delete values;
    delete uuids;
    delete parsed;
    delete processed;
    datum="";
    next;
}
# remember to parse lines as properties
# while inside the property block
/^:PROPERTIES:/ {
    if (afterheading==1) {
        property_block=1; next;
    }
    afterheading=0;
}
/^:END:/ {
    afterheading=0;
    property_block=0; next;
}
/^:/ {
    afterheading=0;
    if (property_block==1) {
        line=$0;
        gsub("^:", "", line);
        st = index(line,":");
        prop_label = substr(line,1,st-1);
        prop_value = substr(line,st+1);

        # TODO does UUID have to be hardcoded?
        if (prop_label == "UUID") {
            prop = "uuid"
        } else {
            # TODO handle if config doesn't have a label
            # TODO rewrite to use the jawk array
            split(config_props, props)
            for (p in props) {
                p_label = _[props[p],"label"]
                if (p_label == prop_label) {
                    prop = props[p]
                    break
                }
            }
            # label_cmd = "jq -r 'map_values(select(.label == \"" prop_label "\")) | keys[0]' "  CONFIG
            # label_cmd | getline prop_new;
            # prop = prop_new
            # close(label_cmd)
        }

        # trim whitespace
        gsub("^[ \t]+", "", prop_value);
        gsub("[ \t]+$", "", prop_value);
        # trim brackets from timestamps
        if (_[prop,"type"] == "date") {
            gsub(/^</, "", prop_value);
            gsub(/>$/, "", prop_value);
        };
        values[prop]=prop_value;
        # keep track of existing props manually
        # because checking the value
        # returns an empty string
        # and so is not reliable
        parsed[prop]=1;
        next;
    }
}
{
    afterheading=0
    datum=datum $0 RS;
}
END {
    # write last node
    if (node==1) {
        values[config_root]=datum
        parsed[config_root]=1;
        write_node();
    }
    printf "%s\n", temp;
}
