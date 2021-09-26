local ContextActionService = game:GetService("ContextActionService")
local Helper = require(script.Parent.Parent.Helper)

local ActionHandler = {}
ActionHandler.__index = ActionHandler

function ActionHandler.new(InputInfo: table, ...)
    local self = {}
    setmetatable(self, ActionHandler)
    self.Actions = {}
    self.__index = self -- incase the actionhandler is inherited from
    self.InputInfo = InputInfo

    for _,Action in pairs({...}) do self:StoreAction(Action) end
    return self
end

function ActionHandler:StoreAction(Action)
    self.Actions[Action.Name] = Action
end

function ActionHandler:GetAction(state, InputState, InputObject)
    if not state then state = "nil" end
    local InputInfo = self.InputInfo
    local ActionName = InputInfo[state] and InputInfo[state][InputState] and InputInfo[state][InputState][InputObject] and InputInfo[state][InputState][InputObject].Name
    if ActionName then
        return self.Actions[ActionName]:Clone()
    elseif getmetatable(self) ~= ActionHandler then
        return getmetatable(self):GetAction(state, InputState, InputObject)
    end
end

function ActionHandler:GetInputInfo(tool)
    if typeof(self.InputInfo) == "table" then return self.InputInfo -- static
    elseif typeof(self.InputInfo) == "function" then return self.InputInfo(tool) end -- dynamic (uses variable buttons)
end

-- function ActionHandler:IsA(name) : boolean
--     if self.Name == name then
--          return true
--     elseif getmetatable(self) ~= ActionHandler then
--         return getmetatable(self):IsA(name)
--     else
--        return false
--     end
-- end

function ParseInput(AvaliableInputs)
    local new = {}
    for inputState,inputInfo in pairs(AvaliableInputs) do  
        for inputObject,actionInfo in pairs(inputInfo) do
            table.insert(new, {actionName = actionInfo.Name, inputObject = inputObject, inputState = inputState})
        end
    end
    return new
end

function ActionHandler:GetAvaliableInputs(state) : table
    local AvaliableInputs = self.InputInfo[state] or {}
    AvaliableInputs = ParseInput(AvaliableInputs)
    if getmetatable(self) ~= ActionHandler then
        return Helper.CombineTables(AvaliableInputs, getmetatable(self):GetAvaliableInputs(state))
    else
        return AvaliableInputs
    end
end

return ActionHandler
