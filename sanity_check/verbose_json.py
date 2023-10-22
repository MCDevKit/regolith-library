from utils import Issue


class JsonContext(object):
    def __init__(self, jsonText, parent=None, value=None):
        self.parent = parent
        self.value = value
        self.index = jsonText.position()
        self.length = 0
        self.children = []

    def to_path(self):
        path = []
        ctx = self
        while ctx is not None:
            path.append(ctx.value)
            ctx = ctx.parent
        path.reverse()
        strPath = "#"
        for p in path:
            if isinstance(p, str):
                strPath += "/" + p
        return strPath

    def make_child(self, jsonText, value=None):
        child = JsonContext(jsonText, self, value)
        self.children.append(child)
        return child

    def update_length(self, jsonText):
        self.length = jsonText.position() - self.index

    def get_text(self, jsonText):
        return jsonText[self.index : self.index + self.length]

    def set_text(self, jsonText, value):
        jsonText = jsonText[: self.index] + value + jsonText[self.index + self.length :]
        change = len(value) - self.length
        self.length = len(value)
        # find root
        ctx = self
        while ctx.parent is not None:
            ctx = ctx.parent
        # update children
        stack = [ctx]
        while len(stack) > 0:
            child = stack.pop()
            if child.index > self.index:
                child.index += change
            stack.extend(child.children)
        return jsonText

    def __str__(self):
        return f"JsonContext({self.to_path()}, {self.index}, {self.length})"


class StringReader(object):
    def __init__(self, string):
        self.string = string
        self.pos = 0

    def peek(self):
        return self.string[self.pos]

    def read(self, n=1):
        self.pos += n
        return self.string[self.pos - n : self.pos]

    def skip(self, n=1):
        self.pos += n

    def read_while(self, predicate):
        start = self.pos
        while self.pos < len(self.string) and predicate(self.string[self.pos]):
            self.pos += 1
        return self.string[start : self.pos]

    def read_until(self, predicate):
        start = self.pos
        while self.pos < len(self.string) and not predicate(self.string[self.pos]):
            self.pos += 1
        return self.string[start : self.pos]

    def skip_while(self, predicate):
        start = self.pos
        while self.pos < len(self.string) and predicate(self.string[self.pos]):
            self.pos += 1

    def skip_until(self, predicate):
        start = self.pos
        while self.pos < len(self.string) and not predicate(self.string[self.pos]):
            self.pos += 1

    def position(self):
        return self.pos

    def available(self):
        return len(self.string) - self.pos


class JsonListener(object):
    def __init__(self):
        pass

    def enterObject(self, ctx):
        return False

    def exitObject(self, ctx):
        return False

    def enterField(self, ctx):
        return False

    def exitField(self, ctx):
        return False

    def enterArray(self, ctx):
        return False

    def exitArray(self, ctx):
        return False

    def enterString(self, ctx):
        return False

    def exitString(self, ctx, value):
        return False

    def enterFieldName(self, ctx):
        return False

    def exitFieldName(self, ctx, value):
        return False

    def enterBoolean(self, ctx):
        return False

    def exitBoolean(self, ctx, value):
        return False

    def enterNull(self, ctx):
        return False

    def exitNull(self, ctx):
        return False

    def enterNumber(self, ctx):
        return False

    def exitNumber(self, ctx, value):
        return False


def parseJson(jsonText, listener):
    reader = StringReader(jsonText)
    ctx = JsonContext(reader)
    parseValue(reader, listener, ctx)
    return ctx


def skipWhitespace(jsonText):
    jsonText.skip_while(lambda c: c in " \t\n\r")


def parseValue(jsonText, listener, ctx):
    skipWhitespace(jsonText)
    if jsonText.peek() == "{":
        return parseObject(jsonText, listener, ctx.make_child(jsonText))
    elif jsonText.peek() == "[":
        return parseArray(jsonText, listener, ctx.make_child(jsonText))
    elif jsonText.peek() == '"':
        return parseString(jsonText, listener, ctx.make_child(jsonText))
    elif jsonText.peek() == "t" or jsonText.peek() == "f":
        return parseBoolean(jsonText, listener, ctx.make_child(jsonText))
    elif jsonText.peek() == "n":
        return parseNull(jsonText, listener, ctx.make_child(jsonText))
    else:
        return parseNumber(jsonText, listener, ctx.make_child(jsonText))


def parseObject(jsonText, listener, ctx):
    if jsonText.peek() != "{":
        raise Exception("Expected {")
    if listener.enterObject(ctx):
        return True
    jsonText.skip()
    while jsonText.available() > 0:
        skipWhitespace(jsonText)
        if jsonText.peek() == "}":
            ctx.update_length(jsonText)
            return listener.exitObject(ctx)
        stop = parseField(jsonText, listener, ctx.make_child(jsonText))
        if stop:
            return True
        skipWhitespace(jsonText)
        if jsonText.peek() == "}":
            jsonText.skip()
            ctx.update_length(jsonText)
            return listener.exitObject(ctx)
        if jsonText.peek() != ",":
            raise Exception("Expected ,")
        jsonText.skip()
    raise Exception("Expected }")


def parseField(jsonText, listener, ctx):
    if jsonText.peek() != '"':
        raise Exception('Expected "')
    name, stop = parseFieldName(jsonText, listener, ctx.make_child(jsonText))
    if stop:
        return True
    ctx.name = name
    if listener.enterField(ctx):
        return True
    skipWhitespace(jsonText)
    if jsonText.peek() != ":":
        raise Exception("Expected :")
    jsonText.skip()
    stop = parseValue(jsonText, listener, ctx.make_child(jsonText, name))
    ctx.update_length(jsonText)
    if stop:
        return True
    return listener.exitField(ctx)


def parseString(jsonText, listener, ctx):
    if jsonText.peek() != '"':
        raise Exception('Expected "')
    if listener.enterString(ctx):
        return True
    jsonText.skip()
    while jsonText.available() > 0:
        if jsonText.peek() == '"':
            jsonText.skip()
            ctx.update_length(jsonText)
            name = unescape_string(jsonText.string[ctx.index : ctx.index + ctx.length])
            return listener.exitString(ctx, name)
        elif jsonText.peek() == "\\":
            jsonText.skip()
        jsonText.skip()
    raise Exception('Expected "')


def parseFieldName(jsonText, listener, ctx):
    if jsonText.peek() != '"':
        raise Exception('Expected "')
    if listener.enterFieldName(ctx):
        return "", True
    jsonText.skip()
    while jsonText.available() > 0:
        if jsonText.peek() == '"':
            jsonText.skip()
            ctx.update_length(jsonText)
            name = unescape_string(jsonText.string[ctx.index : ctx.index + ctx.length])
            return name, listener.exitFieldName(ctx, name)
        elif jsonText.peek() == "\\":
            jsonText.skip()
        jsonText.skip()
    raise Exception('Expected "')


def parseArray(jsonText, listener, ctx):
    if jsonText.peek() != "[":
        raise Exception("Expected [")
    if listener.enterArray(ctx):
        return True
    jsonText.skip()
    while jsonText.available() > 0:
        skipWhitespace(jsonText)
        if jsonText.peek() == "]":
            jsonText.skip()
            ctx.update_length(jsonText)
            return listener.exitArray(ctx)
        stop = parseValue(jsonText, listener, ctx.make_child(jsonText))
        if stop:
            return jsonText, True
        skipWhitespace(jsonText)
        if jsonText.peek() == "]":
            jsonText.skip()
            ctx.update_length(jsonText)
            return listener.exitArray(ctx)
        if jsonText.peek() != ",":
            raise Exception("Expected ,")
        jsonText.skip()
    raise Exception("Expected ]")


def parseBoolean(jsonText, listener, ctx):
    if jsonText.peek() == "t":
        if jsonText.read(4) != "true":
            raise Exception("Expected true")
        if listener.enterBoolean(ctx):
            return True
        ctx.update_length(jsonText)
        return listener.exitBoolean(ctx, True)
    elif jsonText.peek() == "f":
        if jsonText.read(5) != "false":
            raise Exception("Expected false")
        if listener.enterBoolean(ctx):
            return True
        ctx.update_length(jsonText)
        return listener.exitBoolean(ctx, False)
    raise Exception("Expected true or false")


def parseNull(jsonText, listener, ctx):
    if jsonText.read(4) != "null":
        raise Exception("Expected null")
    if listener.enterNull(ctx):
        return True
    ctx.update_length(jsonText)
    return listener.exitNull(ctx)


def parseNumber(jsonText, listener, ctx):
    num = jsonText.read_while(lambda c: c in "0123456789-+eE.")
    if len(num) == 0:
        raise Exception("Expected number")
    if listener.enterNumber(ctx):
        return True
    ctx.update_length(jsonText)
    return listener.exitNumber(ctx, num)


def is_float(jsonString, value):
    v = value.get_text(jsonString)
    if v[0] == '"':
        return False
    try:
        parsed = float(v)
        if parsed.is_integer() and "." not in v:
            return False
        return True
    except ValueError:
        return False


def is_float_or_string(jsonString, value):
    v = value.get_text(jsonString)
    if v[0] == '"':
        return True
    try:
        parsed = float(v)
        if parsed.is_integer() and "." not in v:
            return False
        return True
    except ValueError:
        return False


def unescape_string(string):
    return string[1:-1].replace('\\"', '"').replace("\\\\", "\\")


class PropertyListener(JsonListener):
    def __init__(self, jsonText):
        self.currentProperty = None
        self.currentRange = []
        self.currentType = None
        self.currentDefault = None
        self.jsonText = jsonText
        self.issueList = []

    def onEntityProperty(self, property, type, range, default):
        if unescape_string(type.get_text(self.jsonText)) == "float":
            if len(range) != 2:
                return
            if not is_float(self.jsonText, range[0]):
                self.issueList.append(
                    Issue(
                        f"Property {property} has invalid start range value",
                        lambda text: range[0].set_text(
                            text, range[0].get_text(text) + ".0"
                        ),
                    )
                )
            if not is_float(self.jsonText, range[1]):
                self.issueList.append(
                    Issue(
                        f"Property {property} has invalid end range value",
                        lambda text: range[1].set_text(
                            text, range[1].get_text(text) + ".0"
                        ),
                    )
                )
            if not is_float_or_string(self.jsonText, default):
                self.issueList.append(
                    Issue(
                        f"Property {property} has invalid default value",
                        lambda text: default.set_text(
                            text, default.get_text(text) + ".0"
                        ),
                    )
                )

    def enterObject(self, ctx):
        if ctx.to_path().startswith("#/minecraft:entity/description/properties/"):
            self.currentProperty = ctx.to_path().split("/")[-1]
        return False

    def exitObject(self, ctx):
        if ctx.to_path() == "#/minecraft:entity/description/properties":
            return True
        if ctx.to_path().startswith("#/minecraft:entity/description/properties/"):
            self.onEntityProperty(
                self.currentProperty,
                self.currentType,
                self.currentRange,
                self.currentDefault,
            )
            self.currentProperty = None
            self.currentRange = []
            self.currentType = None
            self.currentDefault = None
        return False

    def exitString(self, ctx, value):
        if (
            self.currentProperty != None
            and ctx.to_path()
            == f"#/minecraft:entity/description/properties/{self.currentProperty}/default"
        ):
            self.currentDefault = ctx
        if (
            self.currentProperty != None
            and ctx.to_path()
            == f"#/minecraft:entity/description/properties/{self.currentProperty}/type"
        ):
            self.currentType = ctx
        return False

    def exitNumber(self, ctx, value):
        if (
            self.currentProperty != None
            and ctx.to_path()
            == f"#/minecraft:entity/description/properties/{self.currentProperty}/range"
        ):
            self.currentRange.append(ctx)
        if (
            self.currentProperty != None
            and ctx.to_path()
            == f"#/minecraft:entity/description/properties/{self.currentProperty}/default"
        ):
            self.currentDefault = ctx
        return False


# if __name__ == "__main__":
#     testJson = '{}'
#     with open("sanity_check/test.json", "r") as f:
#         testJson = f.read()

#     listener = PropertyListener(testJson)
#     parseJson(testJson, listener)
#     for element in listener.issueList:
#         testJson = element.fixFunc(testJson)
#     with open("sanity_check/test.new.json", "w") as f:
#         f.write(testJson)
