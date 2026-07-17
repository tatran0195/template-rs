local M = {}
M.SDK_VERSION = "1.0.0"

function M.dbPh(idx)
    return axeHost.dbPh(idx)
end

function M.dbQuery(sql, params)
    local paramsJson = params and axeHost.jsonEncode(params) or "[]"
    local result = axeHost.dbQuery(sql, paramsJson)
    if not result then error("query returned no result") end
    if result:sub(1, 6) == "error:" then error(result:sub(7)) end
    return axeHost.jsonDecode(result)
end

function M.dbExec(sql, params)
    local paramsJson = params and axeHost.jsonEncode(params) or "[]"
    local result = axeHost.dbExecute(sql, paramsJson)
    return axeHost.jsonDecode(result)
end

function M.dbInsert(table, data, options)
    local dataStr = type(data) == "string" and data or axeHost.jsonEncode(data)
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbInsert(table, dataStr, optStr))
    if result.error then error(result.error) end
    return result
end

function M.dbFetchOne(table, where, options)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbFetchOne(table, whereStr, optStr))
    if result.error then error(result.error) end
    return result.data
end

function M.dbFetchAll(table, where, options)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbFetchAll(table, whereStr, optStr))
    if result.error then error(result.error) end
    return result
end

function M.dbUpdate(table, data, where, options)
    local dataStr = type(data) == "string" and data or axeHost.jsonEncode(data)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbUpdate(table, dataStr, whereStr, optStr))
    if result.error then error(result.error) end
    return result
end

function M.dbDelete(table, where, options)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbDelete(table, whereStr, optStr))
    if result.error then error(result.error) end
    return result
end

function M.dbCount(table, where, options)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbCount(table, whereStr, optStr))
    if result.error then error(result.error) end
    return result.count
end

function M.dbIncrement(table, columns, where, options)
    local colStr = type(columns) == "string" and columns or axeHost.jsonEncode(columns)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbIncrement(table, colStr, whereStr, optStr))
    if result.error then error(result.error) end
    return result
end

function M.dbSum(table, column, where, options)
    local whereStr = (where == nil) and "{}" or (type(where) == "string" and where or axeHost.jsonEncode(where))
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbSum(table, column, whereStr, optStr))
    if result.error then error(result.error) end
    return result.sum
end

function M.dbGroupBy(table, options)
    local optStr = (options == nil) and "{}" or (type(options) == "string" and options or axeHost.jsonEncode(options))
    local result = axeHost.jsonDecode(axeHost.dbGroupBy(table, optStr))
    if result.error then error(result.error) end
    return result
end

function M.dbBegin()
    local result = axeHost.jsonDecode(axeHost.dbBegin())
    if not result.ok then error("dbBegin failed") end
    return result
end

function M.dbCommit()
    local result = axeHost.jsonDecode(axeHost.dbCommit())
    if not result.ok then error("dbCommit failed") end
    return result
end

function M.dbRollback()
    return axeHost.jsonDecode(axeHost.dbRollback())
end

function M.httpGet(url)
    return axeHost.httpGet(url)
end

function M.httpGetJson(url)
    local result = axeHost.httpGet(url)
    if not result then return nil end
    local ok, decoded = pcall(axeHost.jsonDecode, result)
    return ok and decoded or nil
end

function M.httpPost(url, body)
    local jsonBody = type(body) == "string" and body or axeHost.jsonEncode(body)
    return axeHost.httpPost(url, jsonBody)
end

function M.httpPostJson(url, body)
    local jsonBody = type(body) == "string" and body or axeHost.jsonEncode(body)
    local result = axeHost.httpPost(url, jsonBody)
    if not result then return nil end
    local ok, decoded = pcall(axeHost.jsonDecode, result)
    return ok and decoded or nil
end

function M.configGet(key) return axeHost.getConfig(key) end

function M.storeGet(key) return axeHost.getData(key) end
function M.storeSet(key, value) return axeHost.setData(key, value) end

function M.vfsRead(path) return axeHost.vfsRead(path) end
function M.vfsWrite(path, content) return axeHost.vfsWrite(path, content) end
function M.vfsDelete(path) return axeHost.vfsDelete(path) end
function M.vfsExists(path) return axeHost.vfsExists(path) end
function M.vfsList(path)
    local result = axeHost.vfsList(path)
    if not result then return nil end
    local list = {}
    for part in result:gmatch("[^,]+") do
        table.insert(list, part)
    end
    return list
end

function M.vfsStat(path)
    local result = axeHost.vfsStat(path)
    if not result then return nil end
    local ok, decoded = pcall(axeHost.jsonDecode, result)
    return ok and decoded or nil
end

function M.getPost(slug)
    local result = axeHost.getPost(slug)
    if not result then return nil end
    local ok, decoded = pcall(axeHost.jsonDecode, result)
    return ok and decoded or nil
end

function M.ok(data)
    return data
end

function M.fail(status, msg)
    return { __plugin_error = true, __status = status, __message = tostring(msg) }
end

function M.extractJson(input, field)
    local ok, result = pcall(function()
        local parsed = input
        if type(input) == "string" then
            parsed = axeHost.jsonDecode(input)
        end
        if not field or field == "" then return parsed end
        local val = parsed
        for part in field:gmatch("[^.]+") do
            if type(val) ~= "table" then return nil end
            val = val[part]
        end
        if type(val) == "string" then
            local decodeOk, decoded = pcall(axeHost.jsonDecode, val)
            if decodeOk then return decoded end
            return val
        end
        return val
    end)
    return ok and result or nil
end

function M.logInfo(msg) axeHost.log("info", msg) end
function M.logWarn(msg) axeHost.log("warn", msg) end
function M.logError(msg) axeHost.log("error", msg) end

function M.newId() return axeHost.newId() end

function M.eventEmit(eventType, data)
    local dataStr = type(data) == "string" and data or axeHost.jsonEncode(data)
    return axeHost.emitEvent(eventType, dataStr)
end

_sdk_module = M
