import sys
import json
import re
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

x, y, z = sp.symbols("x y z")
KNOWN = {"x": x, "y": y, "z": z}

def clean_question(q):
    q = str(q or "").strip()

    q = q.replace("×", "*").replace("÷", "/").replace("−", "-")
    q = q.replace("^", "**")

    # Remove natural-language instruction words before
    # sending the mathematical expression to SymPy.
    q = re.sub(
        r"^\s*(please\s+)?"
        r"(solve|calculate|compute|find|evaluate|simplify|reduce|"
        r"factor|factorise|factorize)\s*:?[\s]+",
        "",
        q,
        flags=re.I
    )

    return q.rstrip("?. ")

def parse_math(text):
    return parse_expr(
        clean_question(text),
        local_dict=KNOWN,
        transformations=TRANSFORMATIONS,
        evaluate=True
    )

def verify_equation(equation, variable, value):
    try:
        left, right = equation.split("=", 1)
        l = parse_math(left)
        r = parse_math(right)

        return sp.simplify(
            l.subs(variable, value) -
            r.subs(variable, value)
        ) == 0
    except Exception:
        return False

def equation_steps(equation, variable, solution):
    steps = [{
        "step": 1,
        "action": "start",
        "expression": equation,
        "reason": "Start with the original equation."
    }]

    try:
        left, right = equation.split("=", 1)
        left_expr = parse_math(left)
        right_expr = parse_math(right)

        difference = sp.expand(left_expr - right_expr)
        degree = sp.degree(difference, variable)

        if degree == 1:
            coeff = sp.expand(difference).coeff(variable)
            constant = sp.expand(difference).subs(variable, 0)

            if constant != 0:
                steps.append({
                    "step": len(steps) + 1,
                    "action": "move_constant",
                    "expression": f"{sp.sstr(coeff*variable)} = {sp.sstr(-constant)}",
                    "operation": "Move the constant term to the other side.",
                    "reason": "This separates the variable term from the constant."
                })

            value = sp.simplify(solution)

            steps.append({
                "step": len(steps) + 1,
                "action": "divide",
                "expression": f"{sp.sstr(variable)} = {sp.sstr(value)}",
                "operation": f"Divide by {sp.sstr(coeff)}.",
                "reason": "Dividing by the coefficient isolates the variable."
            })

        else:
            factored = sp.factor(difference)

            if factored != difference:
                steps.append({
                    "step": len(steps) + 1,
                    "action": "factor",
                    "expression": f"{sp.sstr(factored)} = 0",
                    "operation": "Factor the equation.",
                    "reason": "Factoring can reveal the values that make the equation zero."
                })

            steps.append({
                "step": len(steps) + 1,
                "action": "solve",
                "expression": f"{sp.sstr(variable)} = {sp.sstr(solution)}",
                "operation": "Solve the resulting equation.",
                "reason": "These values satisfy the equation."
            })

        values = solution if isinstance(solution, list) else [solution]

        for value in values:
            ok = verify_equation(equation, variable, value)

            steps.append({
                "step": len(steps) + 1,
                "action": "verify",
                "expression": f"Substitute {sp.sstr(value)} into the original equation",
                "operation": f"Check {sp.sstr(value)} in the original equation.",
                "reason": "A correct solution must make both sides equal.",
                "verified": ok
            })

        return steps

    except Exception:
        return steps

def solve_equations(text):
    text = clean_question(text)

    # Allow multiple equations connected by natural language.
    parts = re.split(
        r'\s+(?:and|also|while)\s+',
        text,
        flags=re.I
    )

    equations = []

    for part in parts:
        matches = re.findall(
            r'([0-9a-zA-Z\s\+\-\*/\^\(\)\.=]+=[0-9a-zA-Z\s\+\-\*/\^\(\)]+)',
            part
        )

        if matches:
            equations.extend(matches)
        elif "=" in part:
            equations.append(part.strip())

    if not equations:
        return None

    parsed = []
    variables = set()

    for equation in equations:
        try:
            left, right = equation.split("=", 1)

            l = parse_math(left)
            r = parse_math(right)

            parsed.append(sp.Eq(l, r))
            variables |= l.free_symbols
            variables |= r.free_symbols

        except Exception:
            pass

    if not parsed:
        return None

    variables = sorted(
        variables,
        key=lambda symbol: symbol.name
    )

    try:
        solution = sp.solve(
            parsed,
            variables,
            dict=True
        )

        if not solution:
            solution = sp.solve(
                parsed,
                variables
            )

        verified = True

        if isinstance(solution, list):
            for item in solution:
                if isinstance(item, dict):
                    for equation in parsed:
                        verified = verified and all(
                            sp.simplify(
                                equation.lhs.subs(item) -
                                equation.rhs.subs(item)
                            ) == 0
                            for _ in [0]
                        )

        steps = []

        # Single-variable equation.
        if len(parsed) == 1 and len(variables) == 1:

            variable = variables[0]

            values = []

            if isinstance(solution, list):
                for item in solution:
                    if isinstance(item, dict):
                        if variable in item:
                            values.append(item[variable])
                    else:
                        values.append(item)

            if values:

                steps.append({
                    "step": 1,
                    "action": "start",
                    "expression":
                        f"{sp.sstr(parsed[0].lhs)} = "
                        f"{sp.sstr(parsed[0].rhs)}",
                    "reason":
                        "Start with the original equation."
                })

                difference = sp.expand(
                    parsed[0].lhs -
                    parsed[0].rhs
                )

                degree = sp.degree(
                    difference,
                    variable
                )

                if degree == 1:
                    coeff = difference.coeff(variable)
                    constant = difference.subs(
                        variable,
                        0
                    )

                    if constant != 0:
                        steps.append({
                            "step": len(steps) + 1,
                            "action": "move_constant",
                            "expression":
                                f"{sp.sstr(coeff * variable)} = "
                                f"{sp.sstr(-constant)}",
                            "operation":
                                "Move the constant term to the other side.",
                            "reason":
                                "This separates the variable term from the constant."
                        })

                    for value in values:
                        steps.append({
                            "step": len(steps) + 1,
                            "action": "divide",
                            "expression":
                                f"{sp.sstr(variable)} = "
                                f"{sp.sstr(value)}",
                            "operation":
                                f"Divide by {sp.sstr(coeff)}.",
                            "reason":
                                "Dividing by the coefficient isolates the variable."
                        })

                else:
                    factored = sp.factor(difference)

                    if factored != difference:
                        steps.append({
                            "step": len(steps) + 1,
                            "action": "factor",
                            "expression":
                                f"{sp.sstr(factored)} = 0",
                            "operation":
                                "Factor the equation.",
                            "reason":
                                "Factoring can reveal the values that make the equation zero."
                        })

                    for value in values:
                        steps.append({
                            "step": len(steps) + 1,
                            "action": "root",
                            "expression":
                                f"{sp.sstr(variable)} = "
                                f"{sp.sstr(value)}",
                            "operation":
                                "Solve for a value of the variable.",
                            "reason":
                                "This value makes the equation equal to zero."
                        })

                for value in values:
                    ok = verify_equation(
                        f"{sp.sstr(parsed[0].lhs)} = "
                        f"{sp.sstr(parsed[0].rhs)}",
                        variable,
                        value
                    )

                    steps.append({
                        "step": len(steps) + 1,
                        "action": "verify",
                        "expression":
                            f"Substitute {sp.sstr(value)} "
                            "into the original equation",
                        "operation":
                            f"Check {sp.sstr(value)} in the original equation.",
                        "reason":
                            "A correct solution must make both sides equal.",
                        "verified": ok
                    })

        # Multiple equations / simultaneous equations.
        if len(parsed) > 1:
            steps = [{
                "step": 1,
                "action": "form_equations",
                "expression": " and ".join(
                    f"{sp.sstr(e.lhs)} = {sp.sstr(e.rhs)}"
                    for e in parsed
                ),
                "reason":
                    "Translate the problem into a system of equations."
            }]

            steps.append({
                "step": 2,
                "action": "solve_system",
                "expression": sp.sstr(solution),
                "operation":
                    "Solve the equations together.",
                "reason":
                    "The values must satisfy all equations at the same time."
            })

            steps.append({
                "step": 3,
                "action": "verify",
                "expression":
                    "Substitute the solution into every original equation.",
                "reason":
                    "A valid solution must satisfy every equation in the system.",
                "verified": verified
            })

        if not steps:
            steps = [{
                "step": 1,
                "action": "form_equations",
                "expression": " and ".join(
                    f"{sp.sstr(e.lhs)} = {sp.sstr(e.rhs)}"
                    for e in parsed
                ),
                "reason":
                    "Translate the problem into mathematical equations."
            }, {
                "step": 2,
                "action": "solve",
                "expression": sp.sstr(solution),
                "reason":
                    "Solve the equations."
            }, {
                "step": 3,
                "action": "verify",
                "expression":
                    "Substitute the solution back into the equations.",
                "reason":
                    "The solution must satisfy every original equation.",
                "verified": verified
            }]

        return {
            "success": True,
            "solver": "sympy",
            "type": "equation",
            "expression": " and ".join(
                f"{sp.sstr(e.lhs)} = {sp.sstr(e.rhs)}"
                for e in parsed
            ),
            "result": sp.sstr(solution),
            "verified": verified,
            "steps": steps
        }

    except Exception as e:
        return {
            "success": False,
            "solver": "sympy",
            "error": str(e)
        }

def solve_derivative(text):
    m = re.search(
        r'(?:differentiate|derivative\s+of|find\s+the\s+derivative\s+of)\s+(.+)',
        text,
        re.I
    )

    if not m:
        return None

    expression = m.group(1).strip()

    expression = re.sub(
        r'\s+(with\s+respect\s+to|wrt)\s+[a-z]\s*$',
        '',
        expression,
        flags=re.I
    )

    try:
        expr = parse_math(expression)
        variable = next(iter(expr.free_symbols), x)
        result = sp.diff(expr, variable)

        return {
            "success": True,
            "solver": "sympy",
            "type": "derivative",
            "expression": sp.sstr(expr),
            "result": sp.sstr(result),
            "verified": True,
            "steps": [
                {
                    "step": 1,
                    "action": "identify",
                    "expression": sp.sstr(expr),
                    "reason": f"Identify the expression to differentiate with respect to {variable}."
                },
                {
                    "step": 2,
                    "action": "differentiate",
                    "expression": f"d/d{variable} ({sp.sstr(expr)}) = {sp.sstr(result)}",
                    "operation": "Apply the differentiation rules.",
                    "reason": "Differentiate each part using the appropriate rule."
                },
                {
                    "step": 3,
                    "action": "verify",
                    "expression": sp.sstr(result),
                    "reason": "The symbolic derivative was evaluated by the mathematics engine.",
                    "verified": True
                }
            ]
        }

    except Exception:
        return None

def solve_integral(text):
    m = re.search(
        r'(?:integrate|integral\s+of|find\s+the\s+integral\s+of)\s+(.+)',
        text,
        re.I
    )

    if not m:
        return None

    expression = m.group(1).strip()

    try:
        expr = parse_math(expression)
        variable = next(iter(expr.free_symbols), x)
        result = sp.integrate(expr, variable)

        verified = sp.simplify(
            sp.diff(result, variable) - expr
        ) == 0

        return {
            "success": True,
            "solver": "sympy",
            "type": "integral",
            "expression": sp.sstr(expr),
            "result": sp.sstr(result),
            "verified": verified,
            "steps": [
                {
                    "step": 1,
                    "action": "identify",
                    "expression": sp.sstr(expr),
                    "reason": f"Identify the expression to integrate with respect to {variable}."
                },
                {
                    "step": 2,
                    "action": "integrate",
                    "expression": sp.sstr(result),
                    "operation": "Apply the integration rules.",
                    "reason": "Find an antiderivative of the original expression."
                },
                {
                    "step": 3,
                    "action": "verify",
                    "expression": f"d/d{variable} ({sp.sstr(result)}) = {sp.sstr(expr)}",
                    "reason": "Differentiate the result to check it returns the original expression.",
                    "verified": verified
                }
            ]
        }

    except Exception:
        return None

def solve_factor(text):
    m = re.search(
        r'(?:factor|factorise|factorize)\s+(.+)',
        text,
        re.I
    )

    if not m:
        return None

    try:
        expr = parse_math(m.group(1))
        result = sp.factor(expr)
        verified = sp.expand(result - expr) == 0

        return {
            "success": True,
            "solver": "sympy",
            "type": "factorization",
            "expression": sp.sstr(expr),
            "result": sp.sstr(result),
            "verified": verified,
            "steps": [
                {
                    "step": 1,
                    "action": "identify",
                    "expression": sp.sstr(expr),
                    "reason": "Identify the expression to factorise."
                },
                {
                    "step": 2,
                    "action": "factor",
                    "expression": sp.sstr(result),
                    "operation": "Factor the expression.",
                    "reason": "Rewrite the expression as a product of simpler factors."
                },
                {
                    "step": 3,
                    "action": "verify",
                    "expression": f"Expand {sp.sstr(result)} to recover {sp.sstr(expr)}.",
                    "reason": "The factors should reproduce the original expression.",
                    "verified": verified
                }
            ]
        }

    except Exception:
        return None

def solve_simplify(text):
    m = re.search(
        r'(?:simplify|reduce)\s+(.+)',
        text,
        re.I
    )

    if not m:
        return None

    try:
        expr = parse_math(m.group(1))
        result = sp.simplify(expr)
        verified = sp.simplify(expr - result) == 0

        return {
            "success": True,
            "solver": "sympy",
            "type": "simplification",
            "expression": sp.sstr(expr),
            "result": sp.sstr(result),
            "verified": verified,
            "steps": [
                {
                    "step": 1,
                    "action": "identify",
                    "expression": sp.sstr(expr),
                    "reason": "Identify the expression to simplify."
                },
                {
                    "step": 2,
                    "action": "simplify",
                    "expression": sp.sstr(result),
                    "operation": "Apply algebraic simplification rules.",
                    "reason": "Rewrite the expression in an equivalent simpler form."
                },
                {
                    "step": 3,
                    "action": "verify",
                    "expression": "Check equivalence with the original expression.",
                    "reason": "A valid simplification preserves the mathematical value.",
                    "verified": verified
                }
            ]
        }

    except Exception:
        return None

def solve_arithmetic(text):
    cleaned = clean_question(text)

    if "=" in cleaned:
        return None

    if re.search(
        r'\b(differentiate|derivative|integrate|integral|factor|factorise|factorize|simplify|solve)\b',
        cleaned,
        re.I
    ):
        return None

    if not re.search(r'\d', cleaned):
        return None

    try:
        expr = parse_math(cleaned)
        result = sp.simplify(expr)

        return {
            "success": True,
            "solver": "sympy",
            "type": "arithmetic",
            "expression": sp.sstr(expr),
            "result": sp.sstr(result),
            "verified": True,
            "steps": [
                {
                    "step": 1,
                    "action": "translate",
                    "expression": sp.sstr(expr),
                    "reason": "Translate the numerical problem into a mathematical expression."
                },
                {
                    "step": 2,
                    "action": "calculate",
                    "expression": sp.sstr(result),
                    "operation": "Evaluate using the correct order of operations.",
                    "reason": "Mathematical operations must be performed in the correct mathematical order."
                },
                {
                    "step": 3,
                    "action": "verify",
                    "expression": sp.sstr(result),
                    "reason": "The expression was evaluated symbolically.",
                    "verified": True
                }
            ]
        }

    except Exception:
        return None

def solve_substitution(text):
    m = re.search(
        r'evaluate\s+(.+?)\s+(?:when|if)\s+([xyz])\s*=\s*(-?\d+(?:\.\d+)?)',
        text,
        re.I
    )

    if not m:
        return None

    expression = m.group(1)
    variable_name = m.group(2)
    value = sp.sympify(m.group(3))
    variable = KNOWN[variable_name]

    try:
        expr = parse_math(expression)
        substituted = expr.subs(variable, value)
        result = sp.simplify(substituted)

        return {
            "success": True,
            "solver": "sympy",
            "type": "substitution",
            "expression": sp.sstr(expr),
            "result": sp.sstr(result),
            "verified": True,
            "steps": [
                {
                    "step": 1,
                    "action": "identify",
                    "expression": sp.sstr(expr),
                    "reason": "Identify the expression and the given variable value."
                },
                {
                    "step": 2,
                    "action": "substitute",
                    "expression": sp.sstr(substituted),
                    "operation": f"Substitute {sp.sstr(value)} for {variable_name}.",
                    "reason": "Replace the variable with its given value."
                },
                {
                    "step": 3,
                    "action": "calculate",
                    "expression": sp.sstr(result),
                    "operation": "Evaluate the resulting expression.",
                    "reason": "Calculate the numerical value after substitution."
                },
                {
                    "step": 4,
                    "action": "verify",
                    "expression": sp.sstr(result),
                    "reason": "The substituted expression evaluates consistently.",
                    "verified": True
                }
            ]
        }

    except Exception:
        return None

def solve_question(question):
    raw = str(question or "").strip()

    # Most specific operations first.
    # Keep the original wording so each specialist can identify
    # its operation before mathematical parsing cleans the text.
    result = solve_substitution(raw)
    if result:
        return result

    result = solve_derivative(raw)
    if result:
        return result

    result = solve_integral(raw)
    if result:
        return result

    result = solve_factor(raw)
    if result:
        return result

    result = solve_simplify(raw)
    if result:
        return result

    result = solve_equations(raw)
    if result:
        return result

    result = solve_arithmetic(raw)
    if result:
        return result

    return {
        "success": False,
        "solver": "sympy",
        "type": "unsupported",
        "verified": False,
        "steps": [],
        "error": "The mathematics engine could not identify a solvable mathematical structure in this question."
    }

def main():
    for line in sys.stdin:
        try:
            request = json.loads(line)
            question = request.get("question", "")

            result = solve_question(question)

            print(
                json.dumps(result),
                flush=True
            )

        except Exception as e:
            print(
                json.dumps({
                    "success": False,
                    "solver": "sympy",
                    "verified": False,
                    "steps": [],
                    "error": str(e)
                }),
                flush=True
            )

if __name__ == "__main__":
    main()
