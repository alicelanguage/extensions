(comment) @comment
(string) @string
(simple_symbol) @string.special.symbol
(integer) @number
(float) @number
(constant) @type
(instance_variable) @property
(method name: (identifier) @function)
(call method: (identifier) @function)
((identifier) @keyword (#match? @keyword "^(val|var|getter|setter|property|record|struct|interface|enum|lib|fun|using|spawn|async|await|forall|own|unchecked|par)$"))
["def" "class" "module" "if" "unless" "elsif" "else" "while" "until" "for" "in" "do" "end" "case" "when" "then" "begin" "rescue" "ensure" "return" "break" "next" "yield" "and" "or" "not"] @keyword
[(true) (false)] @boolean
(nil) @constant.builtin
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["." "," ":"] @punctuation.delimiter
(super) @keyword
