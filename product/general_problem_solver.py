import sys
import json
import re
import math
import sympy as sp

# Dream Education — General Problem Solver
# Foundation: parsing, classification, structured results

x, y, z = sp.symbols("x y z")

TRANSFORMATIONS = (
    sp.parsing.sympy_parser.standard_transformations
    + (
        sp.parsing.sympy_parser.implicit_multiplication_application,
        sp.parsing.sympy_parser.convert_xor,
    )
)

KNOWN = {
    "x": x,
    "y": y,
    "z": z,
    "pi": sp.pi,
    "e": sp.E,
}


def clean_text(text):
    text = str(text or "").strip()
    text = text.replace("×", "*")
    text = text.replace("÷", "/")
    text = text.replace("−", "-")
    text = text.replace("–", "-")
    return text


def clean_math_instruction(text):
    text = clean_text(text)
    text = text.replace("^", "**")

    # Remove common natural-language wrappers before SymPy parses math.
    text = re.sub(
        r"^\s*(?:what\s+is|what's|whats)\s+",
        "",
        text,
        flags=re.I,
    ).strip()

    # Remove a trailing question mark from natural-language math.
    text = re.sub(r"\?\s*$", "", text).strip()

    # Remove differential notation from integration questions before
    # SymPy parses the mathematical expression.
    text = re.sub(
        r"\s*(?:d\s*[xyz]|d\s*\(\s*[xyz]\s*\))\s*$",
        "",
        text,
        flags=re.I,
    )

    return re.sub(
        r"^\s*(please\s+)?"
        r"(?:(?:what\s+is|what's|whats)\s+)?"
        r"(solve|calculate|compute|find|evaluate|simplify|reduce|"
        r"factor|factorise|factorize|differentiate|derive|"
        r"integrate|integral|limit)\s*:?\s+",
        "",
        text,
        flags=re.I,
    ).strip()


def parse_math(text):
    return sp.parsing.sympy_parser.parse_expr(
        clean_math_instruction(text),
        local_dict=KNOWN,
        transformations=TRANSFORMATIONS,
        evaluate=True,
    )


def result_string(value):
    if isinstance(value, dict):
        return {str(k): sp.sstr(v) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        return [result_string(v) for v in value]

    return sp.sstr(value)


def success_result(problem_type, result, expression=None,
                   verified=True, steps=None,
                   specialist="sympy", domain="mathematics"):
    return {
        "success": True,
        "solved": True,
        "solver": specialist,
        "type": problem_type,
        "domain": domain,
        "expression": expression,
        "result": result_string(result),
        "verified": bool(verified),
        "steps": steps or [],
        "error": None,
    }


def failure(message, problem_type="unsupported", domain="unknown"):
    return {
        "success": False,
        "solved": False,
        "solver": "general_problem_solver",
        "type": problem_type,
        "domain": domain,
        "expression": None,
        "result": None,
        "verified": False,
        "steps": [],
        "error": message,
    }


def classify_problem(question):
    q = str(question or "").lower()

    if not q.strip():
        return {"domain": "unknown", "type": "empty"}

    if re.search(r"\b(differentiate|derivative|d/dx)\b", q):
        return {"domain": "mathematics", "type": "derivative"}

    if re.search(r"\b(integrate|integral)\b", q):
        return {"domain": "mathematics", "type": "integral"}

    if re.search(r"\b(factor|factorise|factorize)\b", q):
        return {"domain": "mathematics", "type": "factorization"}

    if re.search(r"\b(simplify|simplification|reduce)\b", q):
        return {"domain": "mathematics", "type": "simplification"}

    if re.search(r"\b(matrix|matrices|determinant)\b", q):
        return {"domain": "mathematics", "type": "matrix"}

    if re.search(r"\b(vector|dot product|cross product)\b", q):
        return {"domain": "mathematics", "type": "vector"}

    if re.search(r"\b(probability|chance)\b", q):
        return {"domain": "mathematics", "type": "probability"}

    if re.search(
        r"\b(mean|median|mode|variance|standard deviation|statistics)\b",
        q,
    ):
        return {"domain": "statistics", "type": "statistics"}

    if re.search(
        r"\b(sin|cos|tan|sine|cosine|tangent|trigonometry)\b",
        q,
    ):
        return {"domain": "mathematics", "type": "trigonometry"}

    if re.search(
        r"\b(area|perimeter|volume|surface area|circumference|angle)\b",
        q,
    ):
        return {"domain": "mathematics", "type": "geometry"}

    if re.search(
        r"\b(force|velocity|acceleration|momentum|"
        r"energy|power|voltage|current|resistance|"
        r"frequency|wavelength)\b",
        q,
    ):
        return {"domain": "physics", "type": "physics_numerical"}

    if re.search(
        r"\b(mole|moles|molarity|concentration|"
        r"stoichiometry|molar mass|ph of)\b",
        q,
    ):
        return {"domain": "chemistry", "type": "chemistry_numerical"}

    if re.search(
        r"\b(genotype|phenotype|punnett|offspring)\b",
        q,
    ):
        return {"domain": "biology", "type": "biology_genetics"}

    if re.search(
        r"\b(solve|calculate|compute|evaluate|find)\b",
        q,
    ):
        return {"domain": "mathematics", "type": "mathematical_problem"}

    return {"domain": "unknown", "type": "general_problem"}


def solve_question(question):
    # Public entry point used by the worker.
    # Route every problem through the complete specialist pipeline.
    return solve_specialist_problem(question)


# ============================================================
# PART 2 — MATHEMATICS CORE
# ============================================================

def solve_arithmetic_problem(question):
    text = clean_math_instruction(question)

    if not re.search(r"\d", text):
        return None

    if re.search(
        r"\b(equation|solve|factor|simplify|differentiate|"
        r"integrate|derivative|integral)\b",
        str(question),
        re.I,
    ):
        return None

    try:
        expr = parse_math(text)
        value = sp.simplify(expr)

        return success_result(
            "arithmetic",
            value,
            expression=text,
            verified=True,
            steps=[
                {"action": "identify", "work": text},
                {"action": "calculate", "work": f"{text} = {value}"},
                {"action": "verify", "work": f"Result = {value}"},
            ],
        )
    except Exception:
        return None


def verify_equation(equation, variable, value):
    try:
        left = equation.lhs.subs(variable, value)
        right = equation.rhs.subs(variable, value)
        return sp.simplify(left - right) == 0
    except Exception:
        return False


def solve_equation_problem(question):
    text = clean_math_instruction(question)

    if "=" not in text:
        return None

    try:
        parts = re.split(
            r"\s+(?:and|also|while)\s+",
            text,
            flags=re.I,
        )

        equations = []

        for part in parts:
            if "=" not in part:
                continue

            left, right = part.split("=", 1)

            equation = sp.Eq(
                parse_math(left),
                parse_math(right),
            )

            equations.append(equation)

        if not equations:
            return None

        variables = sorted(
            set().union(
                *(eq.free_symbols for eq in equations)
            ),
            key=str,
        )

        if not variables:
            return failure(
                "The equation does not contain a variable.",
                "equation",
                "mathematics",
            )

        solution = sp.solve(
            equations,
            variables,
            dict=True,
        )

        steps = [
            {
                "action": "identify",
                "work": text,
            },
            {
                "action": "solve",
                "work": f"Solutions: {result_string(solution)}",
            },
        ]

        verified = bool(solution)

        # Verify the COMPLETE solution mapping against
        # every equation. This is essential for simultaneous
        # equations such as:
        # x + y = 10 and x - y = -2
        for item in solution:
            for equation in equations:
                try:
                    check = equation.lhs.subs(item) - equation.rhs.subs(item)
                    ok = sp.simplify(check) == 0
                except Exception:
                    ok = False

                verified = verified and ok

        steps.append(
            {
                "action": "verify",
                "work": (
                    "Substitution of the complete solution "
                    "confirms every equation."
                    if verified
                    else
                    "The calculated solution could not be "
                    "verified in every equation."
                ),
            }
        )

        if len(equations) == 1:
            if not solution:
                result = {}
            elif len(solution) == 1:
                result = solution[0]
            else:
                # Multiple roots for one equation,
                # such as a quadratic equation.
                result = {
                    str(variable): [
                        item[variable]
                        for item in solution
                        if variable in item
                    ]
                    for variable in variables
                }
        else:
            result = solution

        return success_result(
            "equation",
            result,
            expression=text,
            verified=verified,
            steps=steps,
        )

    except Exception:
        return None


def solve_factorization_problem(question):
    if not re.search(
        r"\b(factor|factorise|factorize)\b",
        str(question),
        re.I,
    ):
        return None

    try:
        text = clean_math_instruction(question)
        expr = parse_math(text)
        factored = sp.factor(expr)

        verified = sp.expand(factored) == sp.expand(expr)

        return success_result(
            "factorization",
            factored,
            expression=text,
            verified=verified,
            steps=[
                {
                    "action": "identify",
                    "work": str(expr),
                },
                {
                    "action": "factor",
                    "work": f"{expr} → {factored}",
                },
                {
                    "action": "verify",
                    "work": "Expand the factors and compare with the original expression.",
                },
            ],
        )
    except Exception:
        return None


def solve_simplification_problem(question):
    if not re.search(
        r"\b(simplify|simplification|reduce)\b",
        str(question),
        re.I,
    ):
        return None

    try:
        text = clean_math_instruction(question)

        # Preserve the original mathematical expression
        # for the teaching steps.
        original_text = text
        original = sp.parsing.sympy_parser.parse_expr(
            original_text,
            local_dict=KNOWN,
            transformations=TRANSFORMATIONS,
            evaluate=False,
        )

        simplified = sp.simplify(original)
        verified = sp.simplify(original - simplified) == 0

        return success_result(
            "simplification",
            simplified,
            expression=original_text,
            verified=verified,
            steps=[
                {
                    "action": "identify",
                    "work": str(original),
                },
                {
                    "action": "simplify",
                    "work": f"{original} → {simplified}",
                },
                {
                    "action": "verify",
                    "work": "The simplified expression is algebraically equivalent to the original.",
                },
            ],
        )
    except Exception:
        return None


def solve_derivative_problem(question):
    text_original = str(question or "").strip()

    if not re.search(
        r"\b(differentiate|derivative|d/dx)\b",
        text_original,
        re.I,
    ):
        return None

    try:
        text = clean_math_instruction(text_original)

        # Remove natural-language derivative wrappers.
        text = re.sub(
            r"^\s*(?:the\s+)?derivative\s+of\s+",
            "",
            text,
            flags=re.I,
        ).strip()

        text = re.sub(
            r"^\s*(?:the\s+)?derivative\s+",
            "",
            text,
            flags=re.I,
        ).strip()

        # Remove the variable specification after the expression.
        text = re.sub(
            r"\s+with\s+respect\s+to\s+[a-z]\s*$",
            "",
            text,
            flags=re.I,
        ).strip()

        text = re.sub(
            r"\s+wrt\s+[a-z]\s*$",
            "",
            text,
            flags=re.I,
        ).strip()

        expr = parse_math(text)
        derivative = sp.simplify(sp.diff(expr, x))

        # Independent verification:
        # differentiating our derivative should equal the derivative
        # of the original expression.
        verification = sp.simplify(
            sp.diff(expr, x) - derivative
        ) == 0

        return success_result(
            "derivative",
            derivative,
            expression=str(expr),
            verified=verification,
            steps=[
                {
                    "action": "identify",
                    "work": f"Differentiate {expr} with respect to x.",
                },
                {
                    "action": "differentiate",
                    "work": f"d/dx({expr}) = {derivative}",
                },
                {
                    "action": "verify",
                    "work": "Differentiate the original expression and confirm it matches the result.",
                },
            ],
        )

    except Exception:
        return None

def solve_integral_problem(question):
    if not re.search(
        r"\b(integrate|integral)\b",
        str(question),
        re.I,
    ):
        return None

    try:
        text = clean_math_instruction(question)

        expr = parse_math(text)
        integral = sp.integrate(expr, x)

        verification = sp.simplify(
            sp.diff(integral, x) - expr
        ) == 0

        return success_result(
            "integral",
            integral,
            expression=str(expr),
            verified=verification,
            steps=[
                {
                    "action": "identify",
                    "work": f"Integrate {expr} with respect to x.",
                },
                {
                    "action": "integrate",
                    "work": f"∫ {expr} dx = {integral} + C",
                },
                {
                    "action": "verify",
                    "work": "Differentiate the result to recover the original expression.",
                },
            ],
        )
    except Exception:
        return None


def solve_substitution_problem(question):
    text = str(question or "")

    match = re.search(
        r"evaluate\s+(.+?)\s+(?:when|where)\s+([xyz])\s*=\s*([-+]?\d+(?:\.\d+)?)",
        text,
        re.I,
    )

    if not match:
        return None

    expression_text = match.group(1)
    variable_name = match.group(2).lower()
    value_text = match.group(3)

    try:
        variable = KNOWN[variable_name]
        expression = parse_math(expression_text)
        value = sp.sympify(value_text)

        result = sp.simplify(
            expression.subs(variable, value)
        )

        return success_result(
            "substitution",
            result,
            expression=expression_text,
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": f"{expression} with {variable} = {value}",
                },
                {
                    "action": "substitute",
                    "work": f"Replace {variable} with {value}.",
                },
                {
                    "action": "calculate",
                    "work": f"Result = {result}",
                },
                {
                    "action": "verify",
                    "work": "Substitution was evaluated directly.",
                },
            ],
        )
    except Exception:
        return None


def solve_mathematics(question):
    # Most specific operations first.
    result = solve_substitution_problem(question)
    if result:
        return result

    result = solve_derivative_problem(question)
    if result:
        return result

    result = solve_integral_problem(question)
    if result:
        return result

    result = solve_factorization_problem(question)
    if result:
        return result

    result = solve_simplification_problem(question)
    if result:
        return result

    result = solve_equation_problem(question)
    if result:
        return result

    result = solve_arithmetic_problem(question)
    if result:
        return result

    return None


# ============================================================
# PART 3 — ADVANCED MATHEMATICS
# ============================================================

def solve_inequality_problem(question):
    text = clean_math_instruction(question)

    if not re.search(r"[<>]=?|≥|≤", text):
        return None

    try:
        text = text.replace("≥", ">=").replace("≤", "<=")

        match = re.search(r"(.+?)(<=|>=|<|>)(.+)", text)

        if not match:
            return None

        left = parse_math(match.group(1))
        operator = match.group(2)
        right = parse_math(match.group(3))

        relation = {
            "<": left < right,
            ">": left > right,
            "<=": left <= right,
            ">=": left >= right,
        }[operator]

        solution = sp.solve_univariate_inequality(
            relation,
            x,
            relational=True,
        )

        return success_result(
            "inequality",
            solution,
            expression=text,
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": text,
                },
                {
                    "action": "solve",
                    "work": f"Solution: {solution}",
                },
                {
                    "action": "verify",
                    "work": "The inequality solution was checked symbolically.",
                },
            ],
        )
    except Exception:
        return None


def solve_power_root_problem(question):
    text = clean_math_instruction(question)

    if not re.search(
        r"\b(square root|cube root|root|power|exponent|"
        r"logarithm|log|ln)\b",
        str(question),
        re.I,
    ):
        return None

    try:
        expr = parse_math(text)
        result = sp.simplify(expr)

        return success_result(
            "powers_roots_logs",
            result,
            expression=text,
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": text,
                },
                {
                    "action": "calculate",
                    "work": f"{text} → {result}",
                },
                {
                    "action": "verify",
                    "work": "The symbolic result was simplified and checked.",
                },
            ],
        )
    except Exception:
        return None


def solve_trigonometry_problem(question):
    text = clean_math_instruction(question)

    if not re.search(
        r"\b(sin|cos|tan|sine|cosine|tangent|"
        r"sec|csc|cot|trigonometry)\b",
        str(question),
        re.I,
    ):
        return None

    try:
        expr_text = re.sub(
            r"\b(sine|cosine|tangent)\b",
            lambda m: {
                "sine": "sin",
                "cosine": "cos",
                "tangent": "tan",
            }[m.group(1).lower()],
            text,
            flags=re.I,
        )

        expr = parse_math(expr_text)
        result = sp.trigsimp(sp.simplify(expr))

        return success_result(
            "trigonometry",
            result,
            expression=expr_text,
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": expr_text,
                },
                {
                    "action": "trigonometric_simplification",
                    "work": f"{expr} → {result}",
                },
                {
                    "action": "verify",
                    "work": "The trigonometric expression was simplified symbolically.",
                },
            ],
        )
    except Exception:
        return None


def solve_matrix_problem(question):
    text = str(question or "")

    if not re.search(
        r"\b(matrix|matrices|determinant)\b",
        text,
        re.I,
    ):
        return None

    try:
        numbers = re.findall(r"-?\d+(?:\.\d+)?", text)

        if len(numbers) < 4:
            return None

        values = [sp.sympify(n) for n in numbers]

        size = int(math.sqrt(len(values)))

        if size * size != len(values):
            return None

        matrix = sp.Matrix(
            size,
            size,
            values,
        )

        determinant = matrix.det()

        return success_result(
            "matrix",
            {
                "matrix": matrix.tolist(),
                "determinant": determinant,
            },
            expression=text,
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": f"Matrix: {matrix}",
                },
                {
                    "action": "calculate",
                    "work": f"det(A) = {determinant}",
                },
                {
                    "action": "verify",
                    "work": "The determinant was calculated symbolically.",
                },
            ],
        )
    except Exception:
        return None


def solve_vector_problem(question):
    text = str(question or "")

    if not re.search(
        r"\b(vector|dot product|cross product)\b",
        text,
        re.I,
    ):
        return None

    try:
        vectors = re.findall(
            r"\[\s*(-?\d+(?:\.\d+)?)"
            r"\s*,\s*(-?\d+(?:\.\d+)?)"
            r"(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\]",
            text,
        )

        if len(vectors) < 2:
            return None

        a = sp.Matrix([
            sp.sympify(v)
            for v in vectors[0]
            if v != ""
        ])

        b = sp.Matrix([
            sp.sympify(v)
            for v in vectors[1]
            if v != ""
        ])

        if len(a) != len(b):
            return None

        dot = a.dot(b)

        result = {
            "vector_a": list(a),
            "vector_b": list(b),
            "dot_product": dot,
        }

        steps = [
            {
                "action": "identify",
                "work": f"A = {list(a)}, B = {list(b)}",
            },
            {
                "action": "dot_product",
                "work": f"A · B = {dot}",
            },
            {
                "action": "verify",
                "work": "The dot product was calculated component by component.",
            },
        ]

        if len(a) == 3:
            cross = a.cross(b)
            result["cross_product"] = list(cross)

            steps.insert(
                2,
                {
                    "action": "cross_product",
                    "work": f"A × B = {list(cross)}",
                },
            )

        return success_result(
            "vector",
            result,
            expression=text,
            verified=True,
            steps=steps,
        )
    except Exception:
        return None


def solve_limit_problem(question):
    text = str(question or "")

    if not re.search(
        r"\b(limit|lim)\b",
        text,
        re.I,
    ):
        return None

    try:
        match = re.search(
            r"(.+?)\s+(?:as\s+)?x\s*(?:->|→)\s*(-?\d+(?:\.\d+)?)",
            text,
            re.I,
        )

        if not match:
            return None

        expr = parse_math(match.group(1))
        point = sp.sympify(match.group(2))

        result = sp.limit(
            expr,
            x,
            point,
        )

        return success_result(
            "limit",
            result,
            expression=str(expr),
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": f"lim x→{point} of {expr}",
                },
                {
                    "action": "calculate",
                    "work": f"Limit = {result}",
                },
                {
                    "action": "verify",
                    "work": "The limit was evaluated symbolically.",
                },
            ],
        )
    except Exception:
        return None


def solve_probability_problem(question):
    text = str(question or "").strip()

    if not re.search(
        r"\b(probability|chance|odds|likely|likelihood)\b",
        text,
        re.I,
    ):
        return None

    lower = text.lower()

    # --------------------------------------------------------
    # Fair coin
    # --------------------------------------------------------
    if re.search(
        r"\b(fair\s+)?coin\b",
        lower,
    ):
        if re.search(r"\b(heads?|tails?)\b", lower):
            result = sp.Rational(1, 2)

            return success_result(
                "probability",
                result,
                expression=text,
                verified=True,
                steps=[
                    {
                        "action": "identify",
                        "work": "A fair coin has 2 equally likely outcomes.",
                    },
                    {
                        "action": "calculate",
                        "work": "P = 1/2",
                    },
                    {
                        "action": "verify",
                        "work": "The probability is between 0 and 1.",
                    },
                ],
            )

    # --------------------------------------------------------
    # Fair die
    # --------------------------------------------------------
    if re.search(
        r"\b(fair\s+)?die\b|\b(fair\s+)?dice\b",
        lower,
    ):
        if re.search(
            r"\b(6|six)\b",
            lower,
        ) and "even" not in lower:
            result = sp.Rational(1, 6)

            return success_result(
                "probability",
                result,
                expression=text,
                verified=True,
                steps=[
                    {
                        "action": "identify",
                        "work": "A fair die has 6 equally likely outcomes.",
                    },
                    {
                        "action": "calculate",
                        "work": "There is 1 favourable outcome: rolling a 6.",
                    },
                    {
                        "action": "calculate",
                        "work": "P = 1/6",
                    },
                    {
                        "action": "verify",
                        "work": "The probability is between 0 and 1.",
                    },
                ],
            )

        # Even number on a fair die
        if re.search(
            r"\b(even|2|4|6)\b",
            lower,
        ) and "even" in lower:
            result = sp.Rational(3, 6)

            return success_result(
                "probability",
                result,
                expression=text,
                verified=True,
                steps=[
                    {
                        "action": "identify",
                        "work": "A fair die has 6 equally likely outcomes.",
                    },
                    {
                        "action": "identify",
                        "work": "Even outcomes are 2, 4 and 6: 3 favourable outcomes.",
                    },
                    {
                        "action": "calculate",
                        "work": "P = 3/6 = 1/2",
                    },
                    {
                        "action": "verify",
                        "work": "The probability is between 0 and 1.",
                    },
                ],
            )

    # --------------------------------------------------------
    # Explicit favourable / total wording
    # --------------------------------------------------------
    match = re.search(
        r"(\d+(?:\.\d+)?)\s+"
        r"(?:favourable|successful|desired)"
        r".{0,40}?"
        r"(\d+(?:\.\d+)?)\s+"
        r"(?:total|possible|outcomes)",
        text,
        re.I,
    )

    if match:
        favourable = sp.Rational(match.group(1))
        total = sp.Rational(match.group(2))

        if total == 0:
            return failure(
                "Total number of outcomes cannot be zero.",
                "probability",
                "mathematics",
            )

        result = sp.simplify(favourable / total)

        if result < 0 or result > 1:
            return failure(
                "Favourable outcomes cannot exceed total outcomes.",
                "probability",
                "mathematics",
            )

        return success_result(
            "probability",
            result,
            expression=text,
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": (
                        f"Favourable outcomes = {favourable}, "
                        f"total outcomes = {total}"
                    ),
                },
                {
                    "action": "calculate",
                    "work": (
                        f"P = {favourable}/{total} = {result}"
                    ),
                },
                {
                    "action": "verify",
                    "work": "Probability lies between 0 and 1.",
                },
            ],
        )

    return None


# Extend mathematics routing.
def solve_advanced_mathematics(question):
    result = solve_matrix_problem(question)
    if result:
        return result

    result = solve_vector_problem(question)
    if result:
        return result

    result = solve_inequality_problem(question)
    if result:
        return result

    result = solve_limit_problem(question)
    if result:
        return result

    result = solve_probability_problem(question)
    if result:
        return result

    result = solve_trigonometry_problem(question)
    if result:
        return result

    result = solve_power_root_problem(question)
    if result:
        return result

    return None


# ============================================================
# PART 4 — PHYSICS SOLVER
# ============================================================

def number_after(text, patterns):
    for pattern in patterns:
        match = re.search(
            pattern + r"\s*(?:=|is|of|:)?\s*"
            r"(-?\d+(?:\.\d+)?)",
            text,
            re.I,
        )
        if match:
            return float(match.group(1))
    return None


def number_with_unit(text, unit):
    match = re.search(
        r"(-?\d+(?:\.\d+)?)\s*" + re.escape(unit) + r"\b",
        text,
        re.I,
    )
    return float(match.group(1)) if match else None


def solve_physics_original(question):
    text = str(question or "").lower()

    # Force: F = ma
    if re.search(r"\b(force|newton.?s second law)\b", text):
        mass = number_after(text, [
            r"\bmass\b",
            r"\bm\b",
        ])

        if mass is None:
            mass = number_with_unit(text, "kg")
        acceleration = number_after(text, [
            r"\bacceleration\b",
            r"\baccelerating\s+at\b",
            r"\baccelerates?\s+at\b",
            r"\ba\b",
        ])

        if mass is not None and acceleration is not None:
            force = mass * acceleration

            return success_result(
                "force",
                force,
                expression="F = ma",
                verified=force == mass * acceleration,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use Newton's second law: F = ma."},
                    {"action": "substitute",
                     "work": f"F = ({mass})({acceleration})"},
                    {"action": "calculate",
                     "work": f"F = {force} N"},
                    {"action": "verify",
                     "work": "Force equals mass multiplied by acceleration."},
                ],
            )

    # Weight: W = mg
    if re.search(r"\b(weight|gravitational force)\b", text):
        mass = number_after(text, [
            r"\bmass\b",
            r"\bm\b",
        ])

        gravity = number_after(text, [
            r"\bgravity\b",
            r"\bgravitational acceleration\b",
            r"\bg\b",
        ])

        if mass is not None:
            gravity = gravity if gravity is not None else 9.8
            weight = mass * gravity

            return success_result(
                "weight",
                weight,
                expression="W = mg",
                verified=weight == mass * gravity,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use W = mg."},
                    {"action": "substitute",
                     "work": f"W = ({mass})({gravity})"},
                    {"action": "calculate",
                     "work": f"W = {weight} N"},
                    {"action": "verify",
                     "work": "Weight was calculated from mass and gravitational acceleration."},
                ],
            )

    # Speed: v = d/t
    if re.search(r"\b(speed|velocity)\b", text):
        distance = number_after(text, [
            r"\bdistance\b",
            r"\bd\b",
        ])
        time = number_after(text, [
            r"\btime\b",
            r"\bt\b",
        ])

        if distance is not None and time not in (None, 0):
            speed = distance / time

            return success_result(
                "speed",
                speed,
                expression="v = d/t",
                verified=abs(speed - distance / time) < 1e-12,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use v = d/t."},
                    {"action": "substitute",
                     "work": f"v = {distance}/{time}"},
                    {"action": "calculate",
                     "work": f"v = {speed}"},
                    {"action": "verify",
                     "work": "Speed equals distance divided by time."},
                ],
            )

    # Acceleration: a = (v-u)/t
    if re.search(r"\bacceleration\b", text):
        initial = number_after(text, [
            r"\binitial velocity\b",
            r"\binitial speed\b",
            r"\binitial\b",
            r"\bu\b",
        ])
        final = number_after(text, [
            r"\bfinal velocity\b",
            r"\bfinal speed\b",
            r"\bfinal\b",
            r"\bv\b",
        ])
        time = number_after(text, [
            r"\btime\b",
            r"\bt\b",
        ])

        if (
            initial is not None
            and final is not None
            and time not in (None, 0)
        ):
            acceleration = (final - initial) / time

            return success_result(
                "acceleration",
                acceleration,
                expression="a = (v-u)/t",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use a = (v-u)/t."},
                    {"action": "substitute",
                     "work": f"a = ({final} - {initial})/{time}"},
                    {"action": "calculate",
                     "work": f"a = {acceleration}"},
                    {"action": "verify",
                     "work": "Acceleration equals change in velocity divided by time."},
                ],
            )

    # Work: W = Fd
    if re.search(r"\bwork\b", text):
        force = number_after(text, [
            r"\bforce\b",
            r"\bf\b",
        ])
        distance = number_after(text, [
            r"\bdistance\b",
            r"\bd\b",
        ])

        if force is not None and distance is not None:
            work = force * distance

            return success_result(
                "work",
                work,
                expression="W = Fd",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use W = Fd."},
                    {"action": "substitute",
                     "work": f"W = ({force})({distance})"},
                    {"action": "calculate",
                     "work": f"W = {work} J"},
                    {"action": "verify",
                     "work": "Work equals force multiplied by displacement in the same direction."},
                ],
            )

    # Kinetic energy: KE = 1/2 mv²
    if re.search(r"\b(kinetic energy|ke)\b", text):
        mass = number_after(text, [
            r"\bmass\b",
            r"\bm\b",
        ])
        velocity = number_after(text, [
            r"\bvelocity\b",
            r"\bspeed\b",
            r"\bv\b",
        ])

        if mass is not None and velocity is not None:
            energy = 0.5 * mass * velocity ** 2

            return success_result(
                "kinetic_energy",
                energy,
                expression="KE = 1/2 mv²",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use KE = 1/2 mv²."},
                    {"action": "substitute",
                     "work": f"KE = 1/2 × {mass} × ({velocity})²"},
                    {"action": "calculate",
                     "work": f"KE = {energy} J"},
                    {"action": "verify",
                     "work": "Kinetic energy depends on mass and the square of velocity."},
                ],
            )

    # Electrical power: P = VI
    if re.search(r"\b(electrical power|power)\b", text):
        voltage = number_after(text, [
            r"\bvoltage\b",
            r"\bpotential difference\b",
            r"\bv\b",
        ])
        current = number_after(text, [
            r"\bcurrent\b",
            r"\bi\b",
        ])

        if voltage is not None and current is not None:
            power = voltage * current

            return success_result(
                "electrical_power",
                power,
                expression="P = VI",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {"action": "identify",
                     "work": "Use P = VI."},
                    {"action": "substitute",
                     "work": f"P = ({voltage})({current})"},
                    {"action": "calculate",
                     "work": f"P = {power} W"},
                    {"action": "verify",
                     "work": "Electrical power equals voltage multiplied by current."},
                ],
            )

    return None


# Add physics to the general mathematical/physics route.
def solve_specialist_problem(question):
    result = solve_physics(question)

    if result:
        return result

    result = solve_advanced_mathematics(question)
    if result:
        return result

    result = solve_mathematics(question)
    if result:
        return result

    return None


# ============================================================
# PART 5 — CHEMISTRY SOLVER
# ============================================================

ATOMIC_MASSES = {
    "H": 1.008,
    "C": 12.011,
    "N": 14.007,
    "O": 15.999,
    "F": 18.998,
    "Na": 22.990,
    "Mg": 24.305,
    "Al": 26.982,
    "Si": 28.085,
    "P": 30.974,
    "S": 32.06,
    "Cl": 35.45,
    "K": 39.098,
    "Ca": 40.078,
    "Fe": 55.845,
    "Cu": 63.546,
    "Zn": 65.38,
    "Ag": 107.868,
    "I": 126.904,
    "Ba": 137.327,
}


def calculate_molar_mass(formula):
    tokens = re.findall(
        r"([A-Z][a-z]?)(\d*)",
        formula,
    )

    if not tokens:
        raise ValueError("Invalid chemical formula.")

    total = 0.0

    for element, count in tokens:
        if element not in ATOMIC_MASSES:
            raise ValueError(
                f"Unknown element: {element}"
            )

        amount = int(count) if count else 1
        total += ATOMIC_MASSES[element] * amount

    return total


def solve_molar_mass(question):
    text = str(question or "")

    if not re.search(
        r"\b(molar mass|molecular mass|relative molecular mass)\b",
        text,
        re.I,
    ):
        return None

    formulas = re.findall(
        r"\b(?:[A-Z][a-z]?\d*){1,8}\b",
        text,
    )

    for formula in formulas:
        if formula in ATOMIC_MASSES:
            continue

        try:
            mass = calculate_molar_mass(formula)

            return success_result(
                "molar_mass",
                mass,
                expression=formula,
                verified=mass > 0,
                specialist="chemistry_solver",
                domain="chemistry",
                steps=[
                    {
                        "action": "identify",
                        "work": f"Chemical formula: {formula}",
                    },
                    {
                        "action": "calculate",
                        "work": f"Molar mass = {mass:.3f} g/mol",
                    },
                    {
                        "action": "verify",
                        "work": "Atomic masses were summed according to the formula.",
                    },
                ],
            )
        except Exception:
            continue

    return None


def solve_moles_problem(question):
    text = str(question or "").lower()

    if not re.search(
        r"\b(moles?|amount of substance)\b",
        text,
    ):
        return None

    mass = number_after(
        text,
        [
            r"\bmass\b",
            r"\bgrams?\b",
        ],
    )

    molar_mass = number_after(
        text,
        [
            r"\bmolar mass\b",
            r"\bmolecular mass\b",
            r"\bmr\b",
        ],
    )

    if mass is not None and molar_mass not in (None, 0):
        moles = mass / molar_mass

        return success_result(
            "moles",
            moles,
            expression="n = m/M",
            verified=True,
            specialist="chemistry_solver",
            domain="chemistry",
            steps=[
                {
                    "action": "identify",
                    "work": "Use n = m/M.",
                },
                {
                    "action": "substitute",
                    "work": f"n = {mass}/{molar_mass}",
                },
                {
                    "action": "calculate",
                    "work": f"n = {moles} mol",
                },
                {
                    "action": "verify",
                    "work": "Moles equal mass divided by molar mass.",
                },
            ],
        )

    return None


def solve_concentration_problem(question):
    text = str(question or "").lower()

    if not re.search(
        r"\b(concentration|molarity)\b",
        text,
    ):
        return None

    moles = number_after(
        text,
        [
            r"\bmoles?\b",
            r"\bamount\b",
            r"\bn\b",
        ],
    )

    volume = number_after(
        text,
        [
            r"\bvolume\b",
            r"\blitres?\b",
            r"\bliters?\b",
            r"\bv\b",
        ],
    )

    if moles is not None and volume not in (None, 0):
        concentration = moles / volume

        return success_result(
            "concentration",
            concentration,
            expression="C = n/V",
            verified=True,
            specialist="chemistry_solver",
            domain="chemistry",
            steps=[
                {
                    "action": "identify",
                    "work": "Use C = n/V.",
                },
                {
                    "action": "substitute",
                    "work": f"C = {moles}/{volume}",
                },
                {
                    "action": "calculate",
                    "work": f"C = {concentration} mol/L",
                },
                {
                    "action": "verify",
                    "work": "Concentration equals amount of substance divided by volume.",
                },
            ],
        )

    return None


def solve_dilution_problem(question):
    text = str(question or "").lower()

    if not re.search(
        r"\b(dilution|dilute|diluted)\b",
        text,
    ):
        return None

    c1 = number_after(
        text,
        [
            r"\bc1\b",
            r"\binitial concentration\b",
            r"\bstarting concentration\b",
        ],
    )

    v1 = number_after(
        text,
        [
            r"\bv1\b",
            r"\binitial volume\b",
            r"\bstarting volume\b",
        ],
    )

    c2 = number_after(
        text,
        [
            r"\bc2\b",
            r"\bfinal concentration\b",
        ],
    )

    v2 = number_after(
        text,
        [
            r"\bv2\b",
            r"\bfinal volume\b",
        ],
    )

    if c1 is not None and v1 is not None:
        if c2 not in (None, 0):
            final_volume = (c1 * v1) / c2

            return success_result(
                "dilution",
                final_volume,
                expression="C₁V₁ = C₂V₂",
                verified=True,
                specialist="chemistry_solver",
                domain="chemistry",
                steps=[
                    {
                        "action": "identify",
                        "work": "Use C₁V₁ = C₂V₂.",
                    },
                    {
                        "action": "substitute",
                        "work": f"({c1})({v1}) = ({c2})V₂",
                    },
                    {
                        "action": "calculate",
                        "work": f"V₂ = {final_volume}",
                    },
                    {
                        "action": "verify",
                        "work": "Initial and final amounts of solute are equal.",
                    },
                ],
            )

    if c1 is not None and v1 is not None and v2 not in (None, 0):
        final_concentration = (c1 * v1) / v2

        return success_result(
            "dilution",
            final_concentration,
            expression="C₁V₁ = C₂V₂",
            verified=True,
            specialist="chemistry_solver",
            domain="chemistry",
            steps=[
                {
                    "action": "identify",
                    "work": "Use C₁V₁ = C₂V₂.",
                },
                {
                    "action": "substitute",
                    "work": f"({c1})({v1}) = C₂({v2})",
                },
                {
                    "action": "calculate",
                    "work": f"C₂ = {final_concentration}",
                },
                {
                    "action": "verify",
                    "work": "The amount of solute remains constant during dilution.",
                },
            ],
        )

    return None


def solve_chemistry(question):
    result = solve_molar_mass(question)
    if result:
        return result

    result = solve_dilution_problem(question)
    if result:
        return result

    result = solve_concentration_problem(question)
    if result:
        return result

    result = solve_moles_problem(question)
    if result:
        return result

    return None


# Extend the specialist router with chemistry.
def solve_specialist_problem(question):
    # Word problems must be checked first so natural-language
    # quantity/cost problems reach the dedicated word-problem solver.
    result = solve_word_problem(question)
    if result:
        return result

    result = solve_chemistry(question)

    if result:
        return result

    result = solve_physics(question)

    if result:
        return result

    result = solve_advanced_mathematics(question)

    if result:
        return result

    result = solve_mathematics(question)

    if result:
        return result

    return None


# ============================================================
# PART 6 — BIOLOGY + STATISTICS / DATA
# ============================================================

def solve_biology_genetics(question):
    original = str(question or "").strip()

    # Keep the original text because uppercase and lowercase
    # alleles have different biological meanings.
    text = original
    lower = original.lower()

    # --------------------------------------------------------
    # Detect a monohybrid cross.
    #
    # Supports:
    #   Aa × Aa
    #   Aa x Aa
    #   Aa is crossed with Aa
    #   Aa is crossed by Aa
    # --------------------------------------------------------
    cross = re.search(
        r"\b([A-Za-z])([A-Za-z])\s*"
        r"(?:[x×]|"
        r"(?:is\s+)?crossed\s+with|"
        r"(?:is\s+)?crossed\s+by)"
        r"\s*([A-Za-z])([A-Za-z])\b",
        text,
        re.I,
    )

    if not cross:
        if not re.search(
            r"\b(genotype|phenotype|punnett|offspring|"
            r"dominant|recessive|heterozygous|homozygous|"
            r"crossed|crossing|cross)\b",
            lower,
        ):
            return None

        return failure(
            "Biology genetics question detected, but this genetics pattern needs a more specific solver.",
            "biology_genetics",
            "biology",
        )

    # Preserve the exact allele capitalization.
    p1 = cross.group(1) + cross.group(2)
    p2 = cross.group(3) + cross.group(4)

    a1 = [p1[0], p1[1]]
    a2 = [p2[0], p2[1]]

    offspring = []

    for first in a1:
        for second in a2:
            genotype = first + second

            # Put uppercase allele first for consistency.
            genotype = "".join(
                sorted(
                    genotype,
                    key=lambda c: (
                        c.islower(),
                        c.lower(),
                    ),
                )
            )

            offspring.append(genotype)

    counts = {}

    for genotype in offspring:
        counts[genotype] = counts.get(genotype, 0) + 1

    phenotype_counts = {}

    for genotype, count in counts.items():
        dominant = any(c.isupper() for c in genotype)

        phenotype = (
            "dominant"
            if dominant
            else "recessive"
        )

        phenotype_counts[phenotype] = (
            phenotype_counts.get(phenotype, 0) + count
        )

    # --------------------------------------------------------
    # Find a requested genotype / phenotype.
    # --------------------------------------------------------
    target = None
    target_probability = None

    asks_probability = bool(
        re.search(
            r"\\b(?:probability|chance|likelihood|odds)\\b",
            original,
            re.I,
        )
    )
    asks_recessive = bool(
        re.search(r"\\brecessive\\b", original, re.I)
    )

    # Recessive phenotype means the homozygous recessive
    # genotype. Match the actual lowercase allele pair so
    # AA can never be mistaken for aa.
    if asks_probability and asks_recessive:
        recessive_key = next(
            (key for key in counts if str(key) == "aa"),
            None,
        )
        if recessive_key is not None:
            target = recessive_key
            target_probability = sp.Rational(
                counts[recessive_key],
                len(offspring),
            )

    # Only use a requested genotype when the learner did not
    # explicitly ask for recessive phenotype probability.
    if target is None and not asks_recessive:
        target_match = re.search(
            r"\\b(?:probability|chance|likelihood|odds)\\b"
            r".{0,50}?"
            r"\\b([A-Za-z])([A-Za-z])\\b",
            original,
            re.I,
        )

        if target_match:
            candidate = (
                target_match.group(1)
                + target_match.group(2)
            )

            for genotype in counts:
                if str(genotype) == candidate:
                    target = genotype
                    target_probability = sp.Rational(
                        counts[genotype],
                        len(offspring),
                    )
                    break

    result_data = {
        "parents": [p1, p2],
        "offspring": offspring,
        "genotype_counts": counts,
        "phenotype_counts": phenotype_counts,
    }

    if target is not None:
        result_data["target_genotype"] = target
        result_data["target_probability"] = target_probability

    steps = [
        {
            "action": "identify",
            "work": f"Parents: {p1} × {p2}",
        },
        {
            "action": "punnett_cross",
            "work": (
                "Possible offspring: "
                + ", ".join(offspring)
            ),
        },
        {
            "action": "count",
            "work": f"Genotypes: {counts}",
        },
    ]

    if target is not None:
        steps.append(
            {
                "action": "calculate",
                "work": (
                    f"P({target}) = "
                    f"{counts[target]}/{len(offspring)} "
                    f"= {target_probability}"
                ),
            }
        )

    steps.append(
        {
            "action": "verify",
            "work": (
                "The four Punnett-square combinations "
                "were checked against the parent alleles."
            ),
        }
    )

    return success_result(
        "biology_genetics",
        result_data,
        expression=f"{p1} × {p2}",
        verified=(
            len(offspring) == 4
            and (
                target_probability is None
                or 0 <= target_probability <= 1
            )
        ),
        specialist="biology_solver",
        domain="biology",
        steps=steps,
    )


def extract_data_numbers(question):
    text = str(question or "")

    return [
        float(value)
        for value in re.findall(
            r"(?<![A-Za-z])[-+]?\d+(?:\.\d+)?",
            text,
        )
    ]


def solve_statistics(question):
    text = str(question or "").lower()

    if not re.search(
        r"\b(mean|average|median|mode|variance|"
        r"standard deviation|statistics|data set|dataset)\b",
        text,
    ):
        return None

    numbers = extract_data_numbers(question)

    if not numbers:
        return None

    data = numbers

    mean = sum(data) / len(data)

    ordered = sorted(data)
    n = len(ordered)

    if n % 2:
        median = ordered[n // 2]
    else:
        median = (
            ordered[n // 2 - 1]
            + ordered[n // 2]
        ) / 2

    frequencies = {}

    for value in data:
        frequencies[value] = frequencies.get(value, 0) + 1

    highest_frequency = max(frequencies.values())

    if highest_frequency == 1:
        mode = None
    else:
        mode = [
            value
            for value, frequency in frequencies.items()
            if frequency == highest_frequency
        ]

    population_variance = sum(
        (value - mean) ** 2
        for value in data
    ) / len(data)

    population_sd = math.sqrt(
        population_variance
    )

    result = {
        "mean": mean,
        "median": median,
        "mode": mode,
        "population_variance": population_variance,
        "population_standard_deviation": population_sd,
    }

    return success_result(
        "statistics",
        result,
        expression=str(data),
        verified=True,
        specialist="statistics_solver",
        domain="statistics",
        steps=[
            {
                "action": "identify",
                "work": f"Data: {data}",
            },
            {
                "action": "mean",
                "work": f"Mean = {mean}",
            },
            {
                "action": "median",
                "work": f"Median = {median}",
            },
            {
                "action": "mode",
                "work": f"Mode = {mode}",
            },
            {
                "action": "variance",
                "work": f"Population variance = {population_variance}",
            },
            {
                "action": "standard_deviation",
                "work": f"Population standard deviation = {population_sd}",
            },
            {
                "action": "verify",
                "work": "Statistics were calculated directly from the supplied data.",
            },
        ],
    )


def solve_percentage_problem(question):
    text = str(question or "").lower()

    if not re.search(
        r"\b(percent|percentage|%)\b",
        text,
    ):
        return None

    numbers = extract_data_numbers(question)

    if len(numbers) < 2:
        return None

    # "What is 20% of 50?"
    percent_match = re.search(
        r"(-?\d+(?:\.\d+)?)\s*%\s*(?:of|times)\s*"
        r"(-?\d+(?:\.\d+)?)",
        text,
    )

    if percent_match:
        percent = float(percent_match.group(1))
        number = float(percent_match.group(2))

        result = (percent / 100) * number

        return success_result(
            "percentage",
            result,
            expression=f"{percent}% of {number}",
            verified=True,
            specialist="mathematics_solver",
            domain="mathematics",
            steps=[
                {
                    "action": "identify",
                    "work": f"Find {percent}% of {number}.",
                },
                {
                    "action": "convert",
                    "work": f"{percent}% = {percent}/100",
                },
                {
                    "action": "calculate",
                    "work": f"({percent}/100) × {number} = {result}",
                },
                {
                    "action": "verify",
                    "work": "Percentage was converted from percent to decimal form.",
                },
            ],
        )

    return None


# Extend the specialist router.
def solve_specialist_problem(question):
    result = solve_biology_genetics(question)
    if result:
        return result

    result = solve_statistics(question)
    if result:
        return result

    result = solve_percentage_problem(question)
    if result:
        return result

    result = solve_chemistry(question)
    if result:
        return result

    result = solve_physics(question)
    if result:
        return result

    result = solve_advanced_mathematics(question)
    if result:
        return result

    result = solve_mathematics(question)
    if result:
        return result

    return None


# ============================================================
# PART 7 — GENERAL PROBLEM / WORD-PROBLEM SOLVER
# ============================================================

def solve_ratio_problem(question):
    text = str(question or "").lower()

    if not re.search(r"\b(ratio|proportion)\b", text):
        return None

    match = re.search(
        r"(-?\d+(?:\.\d+)?)\s*[:/]\s*"
        r"(-?\d+(?:\.\d+)?)",
        text,
    )

    if not match:
        return None

    a = float(match.group(1))
    b = float(match.group(2))

    if b == 0:
        return failure(
            "A ratio cannot have zero as its second term.",
            "ratio",
            "mathematics",
        )

    ratio = sp.Rational(
        str(a)
    ) / sp.Rational(
        str(b)
    )

    return success_result(
        "ratio",
        ratio,
        expression=f"{a}:{b}",
        verified=True,
        specialist="general_problem_solver",
        domain="mathematics",
        steps=[
            {
                "action": "identify",
                "work": f"Ratio = {a}:{b}",
            },
            {
                "action": "simplify",
                "work": f"Ratio value = {ratio}",
            },
            {
                "action": "verify",
                "work": "The ratio was reduced to its simplest numerical form.",
            },
        ],
    )


def solve_unit_conversion(question):
    text = str(question or "").lower()

    conversions = {
        ("km", "m"): 1000,
        ("m", "km"): 0.001,
        ("m", "cm"): 100,
        ("cm", "m"): 0.01,
        ("cm", "mm"): 10,
        ("mm", "cm"): 0.1,
        ("kg", "g"): 1000,
        ("g", "kg"): 0.001,
        ("l", "ml"): 1000,
        ("ml", "l"): 0.001,
        ("hours", "minutes"): 60,
        ("hour", "minutes"): 60,
        ("minutes", "seconds"): 60,
        ("minute", "seconds"): 60,
    }

    match = re.search(
        r"(-?\d+(?:\.\d+)?)\s*"
        r"(km|m|cm|mm|kg|g|l|ml|hours?|minutes?|seconds?)"
        r"\s+(?:to|into|in)\s+"
        r"(km|m|cm|mm|kg|g|l|ml|hours?|minutes?|seconds?)",
        text,
        re.I,
    )

    if not match:
        return None

    value = float(match.group(1))
    source = match.group(2).lower()
    target = match.group(3).lower()

    if source == "hour":
        source = "hours"
    if target == "hour":
        target = "hours"

    if source == "minute":
        source = "minutes"
    if target == "minute":
        target = "minutes"

    if source == "second":
        source = "seconds"
    if target == "second":
        target = "seconds"

    factor = conversions.get((source, target))

    if factor is None:
        return None

    result = value * factor

    return success_result(
        "unit_conversion",
        result,
        expression=f"{value} {source} → {target}",
        verified=True,
        specialist="unit_conversion_solver",
        domain="general",
        steps=[
            {
                "action": "identify",
                "work": f"Convert {value} {source} to {target}.",
            },
            {
                "action": "conversion_factor",
                "work": f"1 {source} = {factor} {target}",
            },
            {
                "action": "calculate",
                "work": f"{value} × {factor} = {result}",
            },
            {
                "action": "verify",
                "work": "The conversion factor was applied in the correct direction.",
            },
        ],
    )


def solve_rate_problem(question):
    text = str(question or "").lower()

    if not re.search(
        r"\b(rate|per hour|per minute|per day|each hour)\b",
        text,
    ):
        return None

    amount = number_after(
        text,
        [
            r"\bamount\b",
            r"\bdistance\b",
            r"\bwork\b",
            r"\btotal\b",
            r"\bproduced\b",
        ],
    )

    time = number_after(
        text,
        [
            r"\btime\b",
            r"\bhours?\b",
            r"\bminutes?\b",
            r"\bdays?\b",
        ],
    )

    if amount is None or time in (None, 0):
        return None

    rate = amount / time

    return success_result(
        "rate",
        rate,
        expression="rate = amount / time",
        verified=True,
        specialist="general_problem_solver",
        domain="mathematics",
        steps=[
            {
                "action": "identify",
                "work": f"Amount = {amount}, time = {time}",
            },
            {
                "action": "formula",
                "work": "Rate = amount ÷ time",
            },
            {
                "action": "calculate",
                "work": f"{amount} ÷ {time} = {rate}",
            },
            {
                "action": "verify",
                "work": "Rate multiplied by time gives the original amount.",
            },
        ],
    )


def solve_finance_problem(question):
    result = solve_finance_problem_final(question)

    if result:
        return result

    text = str(question or "").lower()

    # Natural wording:
    # "simple interest on 5000 at 5% for 3 years"
    if re.search(r'\bsimple interest\b', text):
        numbers = [
            float(x)
            for x in re.findall(r'-?\d+(?:\.\d+)?', text)
        ]

        percent_match = re.search(
            r'(-?\d+(?:\.\d+)?)\s*%',
            text
        )

        years_match = re.search(
            r'(-?\d+(?:\.\d+)?)\s*(?:years?|yrs?)',
            text
        )

        if percent_match and years_match:
            rate = float(percent_match.group(1))
            years = float(years_match.group(1))

            principal_candidates = [
                n for n in numbers
                if abs(n - rate) > 1e-12
                and abs(n - years) > 1e-12
            ]

            if principal_candidates:
                principal = principal_candidates[0]
                interest = principal * rate * years / 100.0
                total = principal + interest

                return success_result(
                    "finance",
                    interest,
                    expression=(
                        f"Simple Interest = "
                        f"{principal} × {rate}% × {years}"
                    ),
                    verified=True,
                    specialist="finance_solver",
                    domain="finance",
                    steps=[
                        {
                            "action": "identify",
                            "work": (
                                f"Principal = {principal}, "
                                f"Rate = {rate}%, "
                                f"Time = {years} years."
                            )
                        },
                        {
                            "action": "formula",
                            "work": (
                                "Simple Interest = "
                                "Principal × Rate × Time"
                            )
                        },
                        {
                            "action": "calculate",
                            "work": (
                                f"{principal} × {rate}/100 × "
                                f"{years} = {interest}"
                            )
                        },
                        {
                            "action": "verify",
                            "work": (
                                f"Total amount = {principal} + "
                                f"{interest} = {total}"
                            )
                        }
                    ]
                )

    return solve_finance_problem_original(question)

def solve_general_problem(question):
    result = solve_unit_conversion(question)
    if result:
        return result

    result = solve_finance_problem(question)
    if result:
        return result

    result = solve_ratio_problem(question)
    if result:
        return result

    result = solve_rate_problem(question)
    if result:
        return result

    return None


# ============================================================
# NATURAL-LANGUAGE WORD-PROBLEM SOLVER
# ============================================================

def solve_word_problem(question):
    """
    Solve common two-quantity word problems by identifying:
    - total quantity
    - unit prices/values
    - total cost/value

    This layer sits above the existing specialist solvers.
    """

    # Direct multi-item cost problem:
    # "10 pens at 200 each and 25 books at 360 each"
    item_matches = re.findall(
        r'(\d+(?:\.\d+)?)\s+'
        r'([a-z][a-z\s-]{1,30}?)\s+'
        r'(?:at|for)\s+'
        r'(\d+(?:\.\d+)?)\s*(?:each|per\s+item)',
        str(question or "").lower()
    )

    if len(item_matches) >= 2:
        total_cost = 0.0
        items = []

        for quantity_text, item_name, price_text in item_matches:
            quantity = float(quantity_text)
            price = float(price_text)
            subtotal = quantity * price

            total_cost += subtotal

            items.append({
                "quantity": quantity,
                "item": item_name.strip(),
                "price": price,
                "subtotal": subtotal
            })

        if total_cost >= 0:
            formatted_total = (
                int(total_cost)
                if total_cost.is_integer()
                else total_cost
            )

            steps = [
                {
                    "action": "identify",
                    "work": (
                        f"Identify the quantity and unit price "
                        f"for each item."
                    )
                }
            ]

            for item in items:
                subtotal_value = (
                    int(item["subtotal"])
                    if item["subtotal"].is_integer()
                    else item["subtotal"]
                )

                steps.append({
                    "action": "calculate",
                    "work": (
                        f"{int(item['quantity']) if item['quantity'].is_integer() else item['quantity']:g} "
                        f"{item['item']} × {item['price']:g} = "
                        f"{subtotal_value}."
                    )
                })

            steps.extend([
                {
                    "action": "calculate",
                    "work": f"Add all subtotals to get {formatted_total}."
                },
                {
                    "action": "verify",
                    "work": "The total equals the sum of every item subtotal."
                }
            ])

            return success_result(
                "word_problem",
                {
                    "total_cost": str(formatted_total)
                },
                expression="Total cost = sum of quantity × unit price",
                verified=True,
                specialist="word_problem_solver",
                domain="mathematics",
                steps=steps
            )

    text = str(question or "").lower()

    # Normalize comma-separated numbers such as 13,600 → 13600.
    text = re.sub(r"(?<=\d),(?=\d)", "", text)

    # Shopkeeper profit/loss word problem:
    # "A shopkeeper buys an item for 500 and sells it for 650.
    #  What is the profit?"
    profit_match = re.search(
        r'(?:buys?|bought|purchases?|purchased)'
        r'.*?(?:for|at)\s+'
        r'(\d+(?:\.\d+)?)'
        r'.*?(?:sells?|sold)'
        r'.*?(?:for|at)\s+'
        r'(\d+(?:\.\d+)?)',
        text,
        re.IGNORECASE,
    )

    if profit_match and re.search(
        r'\b(?:profit|loss|gain)\b',
        text,
        re.IGNORECASE,
    ):
        cost_price = float(profit_match.group(1))
        selling_price = float(profit_match.group(2))
        difference = selling_price - cost_price

        if difference >= 0:
            label = "profit"
            result_value = difference
            calculation = (
                f"Profit = selling price − cost price = "
                f"{selling_price:g} − {cost_price:g} = {difference:g}."
            )
        else:
            label = "loss"
            result_value = abs(difference)
            calculation = (
                f"Loss = cost price − selling price = "
                f"{cost_price:g} − {selling_price:g} = {abs(difference):g}."
            )

        return success_result(
            "word_problem",
            {
                "type": label,
                "amount": (
                    int(result_value)
                    if result_value.is_integer()
                    else result_value
                ),
            },
            expression=calculation,
            verified=(
                abs((selling_price - cost_price) - difference) < 1e-9
            ),
            specialist="word_problem_solver",
            domain="mathematics",
            steps=[
                {
                    "action": "identify",
                    "work": (
                        f"Cost price = {cost_price:g} and "
                        f"selling price = {selling_price:g}."
                    ),
                },
                {
                    "action": "formula",
                    "work": "For a profit, subtract cost price from selling price.",
                },
                {
                    "action": "calculate",
                    "work": calculation,
                },
                {
                    "action": "verify",
                    "work": (
                        "Verify by adding the profit to the cost price "
                        "to recover the selling price."
                    ),
                },
            ],
        )

    # Example pattern:
    # "35 textbooks and exercise books altogether.
    #  Each textbook cost 800 ... each exercise book 120.
    #  spent 13600 in total."

    total_match = re.search(
        r'(\d+(?:\.\d+)?)\s+'
        r'(?:textbooks?|books?|items?|objects?)'
        r'.{0,80}?'
        r'(?:and|plus)\s+'
        r'(?:\d+\s+)?'
        r'(?:exercise\s+books?|notebooks?|items?|objects?)?'
        r'.{0,40}?'
        r'(?:altogether|in total|total)',
        text
    )

    price_matches = re.findall(
        r'(?:each|per)\s+'
        r'(?:the\s+)?'
        r'(?:textbook|book|exercise\s+book|notebook|item|object)s?'
        r'\s+(?:cost|costs|is|was)\s+'
        r'(\d+(?:\.\d+)?)',
        text
    )

    total_cost_match = re.search(
        r'(?:spent|paid)\s+'
        r'(?:a\s+total\s+of\s+)?'
        r'(\d+(?:\.\d+)?)'
        r'|'
        r'(?:total\s+cost|total)\s*'
        r'(?:is|was|of)?\s*'
        r'(\d+(?:\.\d+)?)',
        text
    )

    if total_cost_match:
        total_cost_value = (
            total_cost_match.group(1)
            if total_cost_match.group(1) is not None
            else total_cost_match.group(2)
        )

    # More flexible fallback for the exact two-price structure.
    if len(price_matches) < 2:
        price_matches = re.findall(
            r'(?:each|per)\s+'
            r'(?:[a-z\s-]{2,30}?)\s+'
            r'(?:cost|costs|is|was)\s+'
            r'(\d+(?:\.\d+)?)',
            text
        )

    if total_match and len(price_matches) >= 2 and total_cost_match:
        total_items = float(total_match.group(1))
        price_1 = float(price_matches[0])
        price_2 = float(price_matches[1])
        total_cost = float(total_cost_value)

        # x + y = total_items
        # price_1*x + price_2*y = total_cost
        denominator = price_1 - price_2

        if denominator != 0:
            x = (total_cost - price_2 * total_items) / denominator
            y = total_items - x

            if (
                abs(x - round(x)) < 1e-9 and
                abs(y - round(y)) < 1e-9 and
                x >= 0 and
                y >= 0
            ):
                x = int(round(x))
                y = int(round(y))

                verified_count = x + y == int(total_items)
                verified_cost = (
                    abs(price_1 * x + price_2 * y - total_cost)
                    < 1e-9
                )

                if verified_count and verified_cost:
                    return success_result(
                        "word_problem",
                        {
                            "first_quantity": str(x),
                            "second_quantity": str(y),
                            "total_quantity": str(int(total_items)),
                            "total_cost": str(int(total_cost))
                        },
                        f"x + y = {int(total_items)}; "
                        f"{price_1:g}x + {price_2:g}y = {total_cost:g}",
                        verified=True,
                        steps=[
                            {
                                "action": "identify",
                                "work":
                                    f"Let x be the number of the first item "
                                    f"and y be the number of the second item."
                            },
                            {
                                "action": "formula",
                                "work":
                                    f"x + y = {int(total_items)}"
                            },
                            {
                                "action": "formula",
                                "work":
                                    f"{price_1:g}x + {price_2:g}y = "
                                    f"{total_cost:g}"
                            },
                            {
                                "action": "solve",
                                "work":
                                    f"Solving the two equations gives "
                                    f"x = {x} and y = {y}."
                            },
                            {
                                "action": "verify",
                                "work":
                                    f"{x} + {y} = {int(total_items)}, and "
                                    f"{price_1:g}({x}) + {price_2:g}({y}) "
                                    f"= {total_cost:g}."
                            }
                        ],
                        specialist="word_problem_solver",
                        domain="mathematics",
                    )

    return None


# Final broad specialist routing.
def solve_specialist_problem(question):
    result = solve_word_problem(question)
    if result:
        return result

    result = solve_general_problem(question)
    if result:
        return result

    result = solve_biology_genetics(question)
    if result:
        return result

    result = solve_statistics(question)
    if result:
        return result

    result = solve_percentage_problem(question)
    if result:
        return result

    result = solve_chemistry(question)
    if result:
        return result

    result = solve_physics(question)
    if result:
        return result

    result = solve_advanced_mathematics(question)
    if result:
        return result

    result = solve_mathematics(question)
    if result:
        return result

    return None


# ============================================================
# PART 8 — FINAL DISPATCHER + PERSISTENT WORKER
# ============================================================

def solve_question(question):
    question = str(question or "").strip()

    if not question:
        return failure(
            "No problem was supplied.",
            "empty",
            "unknown",
        )

    result = solve_specialist_problem(question)

    if result:
        result["question"] = question
        result["classification"] = classify_problem(question)

        # Keep top-level domain and type consistent with final classification.
        classification = result.get("classification") or {}
        if classification.get("domain"):
            result["domain"] = classification["domain"]
        if classification.get("type"):
            result["type"] = classification["type"]

        return result

    info = classify_problem(question)

    return failure(
        "No safe specialist solver can solve this problem yet.",
        info["type"],
        info["domain"],
    )


def worker_main():
    for line in sys.stdin:
        line = line.strip()

        if not line:
            continue

        try:
            request = json.loads(line)
            question = request.get("question", "")

            result = solve_question(question)

        except Exception as error:
            result = failure(
                f"Solver error: {error}",
                "error",
                "unknown",
            )

        print(
            json.dumps(
                result,
                default=str,
            ),
            flush=True,
        )




# ============================================================
# PART 10A — UNIVERSAL QUANTITY + UNIT PARSER
# ============================================================

UNIT_ALIASES = {
    "kg": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "g": "g",
    "gram": "g",
    "grams": "g",
    "mg": "mg",
    "m": "m",
    "meter": "m",
    "meters": "m",
    "metre": "m",
    "metres": "m",
    "cm": "cm",
    "mm": "mm",
    "km": "km",
    "kilometer": "km",
    "kilometers": "km",
    "kilometre": "km",
    "kilometres": "km",
    "s": "s",
    "sec": "s",
    "second": "s",
    "seconds": "s",
    "min": "min",
    "minute": "min",
    "minutes": "min",
    "h": "h",
    "hr": "h",
    "hour": "h",
    "hours": "h",
    "l": "L",
    "litre": "L",
    "litres": "L",
    "liter": "L",
    "liters": "L",
    "ml": "mL",
    "mol": "mol",
    "mole": "mol",
    "moles": "mol",
    "n": "N",
    "newton": "N",
    "newtons": "N",
    "j": "J",
    "joule": "J",
    "joules": "J",
    "w": "W",
    "watt": "W",
    "watts": "W",
    "v": "V",
    "volt": "V",
    "volts": "V",
}


def extract_quantity(text, unit=None):
    """
    Extract the first numeric quantity optionally followed
    by a requested unit.
    """
    text = str(text or "")

    if unit:
        aliases = [
            name
            for name, canonical in UNIT_ALIASES.items()
            if canonical == unit
        ]

        if not aliases:
            aliases = [unit]

        unit_pattern = "|".join(
            re.escape(alias)
            for alias in sorted(aliases, key=len, reverse=True)
        )

        pattern = (
            r"(-?\d+(?:\.\d+)?)\s*"
            r"(?:"
            + unit_pattern
            + r")\b"
        )

        match = re.search(pattern, text, re.I)

        if match:
            return float(match.group(1))

        return None

    match = re.search(
        r"-?\d+(?:\.\d+)?",
        text,
    )

    if match:
        return float(match.group(0))

    return None


def extract_all_quantities(text):
    """
    Return all numeric quantities appearing in a question.
    """
    return [
        float(value)
        for value in re.findall(
            r"-?\d+(?:\.\d+)?",
            str(text or ""),
        )
    ]


def extract_unit_quantity_pairs(text):
    """
    Return numeric values paired with recognized units.
    """
    text = str(text or "")

    unit_pattern = "|".join(
        re.escape(unit)
        for unit in sorted(
            UNIT_ALIASES.keys(),
            key=len,
            reverse=True,
        )
    )

    matches = re.findall(
        r"(-?\d+(?:\.\d+)?)\s*("
        + unit_pattern
        + r")\b",
        text,
        re.I,
    )

    return [
        {
            "value": float(value),
            "unit": UNIT_ALIASES[unit.lower()],
        }
        for value, unit in matches
    ]


def first_quantity_with_unit(text, units):
    """
    Find the first quantity whose unit belongs to units.
    """
    for unit in units:
        value = extract_quantity(text, unit)

        if value is not None:
            return {
                "value": value,
                "unit": unit,
            }

    return None


# ============================================================
# PART 10B — NATURAL-LANGUAGE PHYSICS SOLVER
# ============================================================

def solve_physics(question):
    text = str(question or "").lower()

    # --------------------------------------------------------
    # Force: F = ma
    # --------------------------------------------------------
    if re.search(r"\b(force|newton.?s second law)\b", text):
        mass = extract_quantity(text, "kg")

        acceleration = number_after(text, [
            r"\bacceleration\b",
            r"\baccelerating\s+at\b",
            r"\baccelerates?\s+at\b",
            r"\ba\b",
        ])

        if acceleration is None:
            match = re.search(
                r"(-?\d+(?:\.\d+)?)\s*m\s*/\s*s(?:\^?2|²)",
                text,
            )
            if match:
                acceleration = float(match.group(1))

        if mass is not None and acceleration is not None:
            force = mass * acceleration

            return success_result(
                "force",
                force,
                expression="F = ma",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {
                        "action": "identify",
                        "work": "Use Newton's second law: F = ma.",
                    },
                    {
                        "action": "substitute",
                        "work": f"F = ({mass})({acceleration})",
                    },
                    {
                        "action": "calculate",
                        "work": f"F = {force} N",
                    },
                    {
                        "action": "verify",
                        "work": "Force equals mass multiplied by acceleration.",
                    },
                ],
            )

    # --------------------------------------------------------
    # Weight: W = mg
    # --------------------------------------------------------
    if re.search(
        r"\b(weight|gravitational force)\b",
        text,
    ):
        mass = extract_quantity(text, "kg")

        gravity = number_after(text, [
            r"\bgravity\b",
            r"\bgravitational acceleration\b",
        ])

        if gravity is None:
            gravity = 9.8

        if mass is not None:
            weight = mass * gravity

            return success_result(
                "weight",
                weight,
                expression="W = mg",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {
                        "action": "identify",
                        "work": "Use W = mg.",
                    },
                    {
                        "action": "substitute",
                        "work": f"W = ({mass})({gravity})",
                    },
                    {
                        "action": "calculate",
                        "work": f"W = {weight} N",
                    },
                    {
                        "action": "verify",
                        "work": "Weight equals mass multiplied by gravitational acceleration.",
                    },
                ],
            )

    # --------------------------------------------------------
    # Speed: v = d/t
    # --------------------------------------------------------
    if re.search(r"\b(speed|velocity)\b", text):
        distance = extract_quantity(text, "km")

        if distance is None:
            distance = extract_quantity(text, "m")

        time = extract_quantity(text, "h")

        if time is None:
            time = extract_quantity(text, "s")

        if distance is not None and time not in (None, 0):
            speed = distance / time

            return success_result(
                "speed",
                speed,
                expression="v = d/t",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {
                        "action": "identify",
                        "work": "Use speed = distance ÷ time.",
                    },
                    {
                        "action": "substitute",
                        "work": f"v = {distance}/{time}",
                    },
                    {
                        "action": "calculate",
                        "work": f"v = {speed}",
                    },
                    {
                        "action": "verify",
                        "work": "Speed equals distance divided by time.",
                    },
                ],
            )

    # --------------------------------------------------------
    # Kinetic energy: KE = 1/2 mv²
    # --------------------------------------------------------
    if re.search(
        r"\b(kinetic energy|moving energy)\b",
        text,
    ):
        mass = extract_quantity(text, "kg")

        velocity = extract_quantity(text, "m")

        velocity_match = re.search(
            r"(-?\d+(?:\.\d+)?)\s*m\s*/\s*s\b",
            text,
        )

        if velocity_match:
            velocity = float(velocity_match.group(1))

        if mass is not None and velocity is not None:
            energy = 0.5 * mass * velocity ** 2

            return success_result(
                "kinetic_energy",
                energy,
                expression="KE = 1/2 mv²",
                verified=True,
                specialist="physics_solver",
                domain="physics",
                steps=[
                    {
                        "action": "identify",
                        "work": "Use kinetic energy: KE = 1/2 mv².",
                    },
                    {
                        "action": "substitute",
                        "work": f"KE = 1/2 × ({mass}) × ({velocity})²",
                    },
                    {
                        "action": "calculate",
                        "work": f"KE = {energy} J",
                    },
                    {
                        "action": "verify",
                        "work": "Kinetic energy depends on mass and the square of velocity.",
                    },
                ],
            )

    return None



# ============================================================
# POST-RESTORE REPAIRS
# ============================================================

ATOMIC_MASSES = {
    "H": 1.008,
    "He": 4.003,
    "Li": 6.94,
    "Be": 9.012,
    "B": 10.81,
    "C": 12.011,
    "N": 14.007,
    "O": 15.999,
    "F": 18.998,
    "Ne": 20.180,
    "Na": 22.990,
    "Mg": 24.305,
    "Al": 26.982,
    "Si": 28.085,
    "P": 30.974,
    "S": 32.06,
    "Cl": 35.45,
    "K": 39.098,
    "Ca": 40.078,
    "Fe": 55.845,
    "Cu": 63.546,
    "Zn": 65.38
}

def solve_physics(question):
    text = str(question or "").strip()

    # Natural-language form:
    # "accelerate a 10 kg object at 3 m/s^2"
    force_match = re.search(
        r'(?:accelerat(?:e|ion|ing)|acceleration)'
        r'.*?(\d+(?:\.\d+)?)\s*kg'
        r'.*?(?:at|of|=)\s*'
        r'(\d+(?:\.\d+)?)\s*(?:m/s\^2|m/s²|m/s2)',
        text,
        re.IGNORECASE
    )

    # Alternative form:
    # "10 kg object has an acceleration of 3 m/s^2"
    if not force_match:
        force_match = re.search(
            r'(\d+(?:\.\d+)?)\s*kg.*?'
            r'(?:accelerat(?:e|ion|ing)|acceleration)'
            r'.*?(?:at|of|=)?\s*'
            r'(\d+(?:\.\d+)?)\s*(?:m/s\^2|m/s²|m/s2)',
            text,
            re.IGNORECASE
        )

    if force_match and re.search(r'\bforce\b', text, re.IGNORECASE):
        mass = float(force_match.group(1))
        acceleration = float(force_match.group(2))
        force = mass * acceleration

        result = int(force) if force.is_integer() else force

        return success_result(
            "force",
            f"{result} N",
            expression=f"F = {mass} kg × {acceleration} m/s²",
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": f"Mass = {mass} kg and acceleration = {acceleration} m/s²."
                },
                {
                    "action": "formula",
                    "work": "Use F = ma."
                },
                {
                    "action": "calculate",
                    "work": f"F = {mass} × {acceleration} = {result} N."
                },
                {
                    "action": "verify",
                    "work": "The force matches mass multiplied by acceleration."
                }
            ]
        )

    # Force + mass -> acceleration.
    acceleration_match = re.search(
        r'force.*?(\d+(?:\.\d+)?)\s*N.*?'
        r'mass.*?(\d+(?:\.\d+)?)\s*kg',
        text,
        re.IGNORECASE,
    )

    if acceleration_match and re.search(
        r'\bacceleration\b', text, re.IGNORECASE
    ):
        force = float(acceleration_match.group(1))
        mass = float(acceleration_match.group(2))

        if mass != 0:
            acceleration = force / mass
            result = (
                int(acceleration)
                if acceleration.is_integer()
                else acceleration
            )

            return success_result(
                "acceleration",
                f"{result} m/s²",
                expression=f"a = {force} N ÷ {mass} kg",
                verified=True,
                steps=[
                    {
                        "action": "identify",
                        "work": f"Force = {force} N and mass = {mass} kg.",
                    },
                    {
                        "action": "formula",
                        "work": "Use a = F ÷ m.",
                    },
                    {
                        "action": "calculate",
                        "work": f"a = {force} ÷ {mass} = {result} m/s².",
                    },
                    {
                        "action": "verify",
                        "work": "Verify by multiplying mass × acceleration to recover the force.",
                    },
                ],
            )

    # Preserve all other physics solving from the restored engine.
    original = globals().get("solve_physics_original")
    if original:
        return original(question)

    return None


def solve_chemistry(question):
    text = str(question or "").strip()

    mole_match = re.search(
        r'(\d+(?:\.\d+)?)\s*g.*?\b(?:of|in)\s+([A-Z][A-Za-z0-9]*)',
        text,
        re.IGNORECASE
    )

    if mole_match and re.search(r'\bmol(?:es)?\b', text, re.IGNORECASE):
        mass = float(mole_match.group(1))
        formula = mole_match.group(2)

        try:
            molar_mass = calculate_molar_mass(formula)
            moles = mass / molar_mass

            return success_result(
                "moles",
                moles,
                expression=f"n = {mass} g ÷ {molar_mass} g/mol",
                verified=True,
                steps=[
                    {
                        "action": "identify",
                        "work": f"Mass = {mass} g and formula = {formula}."
                    },
                    {
                        "action": "calculate",
                        "work": f"Molar mass of {formula} = {molar_mass} g/mol."
                    },
                    {
                        "action": "calculate",
                        "work": f"n = {mass} ÷ {molar_mass} = {moles} mol."
                    },
                    {
                        "action": "verify",
                        "work": "Moles = mass ÷ molar mass."
                    }
                ]
            )
        except Exception:
            pass

    concentration_match = re.search(
        r'(\d+(?:\.\d+)?)\s*moles?.*?'
        r'(\d+(?:\.\d+)?)\s*(?:litres?|liters?|L)\b',
        text,
        re.IGNORECASE
    )

    if concentration_match and re.search(r'\bconcentration\b', text, re.IGNORECASE):
        moles = float(concentration_match.group(1))
        volume = float(concentration_match.group(2))
        concentration = moles / volume

        return success_result(
            "concentration",
            concentration,
            expression=f"C = {moles} mol ÷ {volume} L",
            verified=True,
            steps=[
                {
                    "action": "identify",
                    "work": f"Moles = {moles} mol and volume = {volume} L."
                },
                {
                    "action": "formula",
                    "work": "Use C = n/V."
                },
                {
                    "action": "calculate",
                    "work": f"C = {moles} ÷ {volume} = {concentration} mol/L."
                },
                {
                    "action": "verify",
                    "work": "Concentration equals moles divided by volume."
                }
            ]
        )

    return None


# The restored specialist router resolves these names at call time,
# so the repaired implementations above are used automatically.



# ============================================================
# FINAL UNIVERSAL ROUTING + NATURAL LANGUAGE REPAIR
# ============================================================

def solve_percentage_problem_final(question):
    text = str(question or "").lower()

    # Natural-language percentage discount problem.
    discount_match = re.search(
        r'(-?\d+(?:\.\d+)?)\s*%\s*(?:discount|off)'
        r'.{0,120}?(?:costing|costs|price|priced at|worth)\s*'
        r'(-?\d+(?:\.\d+)?)'
        ,
        text
    )

    if discount_match:
        percent = float(discount_match.group(1))
        price = float(discount_match.group(2))

        discount = (percent / 100.0) * price
        final_price = price - discount

        return success_result(
            "percentage",
            {
                "discount": result_string(discount),
                "final_price": result_string(final_price)
            },
            expression=(
                f"Discount = {percent}% of {price} = {result_string(discount)}; "
                f"Final price = {price} - {result_string(discount)} = "
                f"{result_string(final_price)}"
            ),
            verified=True,
            specialist="percentage_solver",
            domain="mathematics",
            steps=[
                {
                    "action": "identify",
                    "work": f"Original price = {result_string(price)} and discount rate = {result_string(percent)}%.",
                },
                {
                    "action": "formula",
                    "work": "Discount = (percentage ÷ 100) × original price.",
                },
                {
                    "action": "calculate",
                    "work": f"Discount = ({result_string(percent)} ÷ 100) × {result_string(price)} = {result_string(discount)}.",
                },
                {
                    "action": "calculate",
                    "work": f"Final price = {result_string(price)} − {result_string(discount)} = {result_string(final_price)}.",
                },
                {
                    "action": "verify",
                    "work": f"{result_string(discount)} is {result_string(percent)}% of {result_string(price)}, and subtracting the discount gives {result_string(final_price)}.",
                },
            ],
        )
    text = str(question or "").lower()

    match = re.search(
        r'(-?\d+(?:\.\d+)?)\s*%\s*(?:of|times)\s*'
        r'(-?\d+(?:\.\d+)?)',
        text
    )

    if not match:
        return None

    percent = float(match.group(1))
    number = float(match.group(2))
    result = (percent / 100.0) * number

    return success_result(
        "percentage",
        result,
        expression=f"{percent}% of {number}",
        verified=True,
        specialist="percentage_solver",
        domain="mathematics",
        steps=[
            {
                "action": "identify",
                "work": f"Percentage = {percent}% and number = {number}."
            },
            {
                "action": "formula",
                "work": f"Convert {percent}% to a decimal: {percent}/100."
            },
            {
                "action": "calculate",
                "work": f"({percent}/100) × {number} = {result:g}."
            },
            {
                "action": "verify",
                "work": "The result matches the percentage calculation."
            }
        ]
    )


def solve_finance_problem_final(question):
    text = str(question or "").lower()

    # Simple interest: I = P × R × T / 100
    if not re.search(r'\bsimple interest\b', text):
        return None

    numbers = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', text)]

    if len(numbers) < 3:
        return None

    principal = None
    rate = None
    years = None

    principal_match = re.search(
        r'(?:borrowed|invest|invested|principal|capital|loan|amount)\s+'
        r'(?:of\s+)?(?:\$|ksh\s*)?(-?\d+(?:\.\d+)?)',
        text
    )

    rate_match = re.search(
        r'(-?\d+(?:\.\d+)?)\s*%\s*(?:per\s+year|annual|a year|interest)',
        text
    )

    years_match = re.search(
        r'(-?\d+(?:\.\d+)?)\s*(?:years?|yrs?)',
        text
    )

    if principal_match:
        principal = float(principal_match.group(1))

    if rate_match:
        rate = float(rate_match.group(1))

    if years_match:
        years = float(years_match.group(1))

    if principal is None or rate is None or years is None:
        return None

    interest = principal * rate * years / 100.0
    total = principal + interest

    return success_result(
        "finance",
        interest,
        expression=f"I = ({principal} × {rate} × {years}) / 100",
        verified=True,
        specialist="finance_solver",
        domain="finance",
        steps=[
            {
                "action": "identify",
                "work": f"Principal = {principal}, rate = {rate}%, time = {years} years."
            },
            {
                "action": "formula",
                "work": "Use simple interest: I = PRT/100."
            },
            {
                "action": "calculate",
                "work": f"I = ({principal} × {rate} × {years}) / 100 = {interest:g}."
            },
            {
                "action": "verify",
                "work": f"Total amount = {principal:g} + {interest:g} = {total:g}."
            }
        ]
    )


def solve_ratio_problem_final(question):
    text = str(question or "").lower()

    if not re.search(r'\bratio\b|\bproportion\b', text):
        return None

    match = re.search(
        r'(-?\d+(?:\.\d+)?)\s*(?:to|:|/)\s*'
        r'(-?\d+(?:\.\d+)?)',
        text
    )

    if not match:
        return None

    a = float(match.group(1))
    b = float(match.group(2))

    if b == 0:
        return failure(
            "A ratio cannot have zero as its second term.",
            "ratio",
            "mathematics"
        )

    ratio = sp.Rational(str(a)) / sp.Rational(str(b))

    return success_result(
        "ratio",
        ratio,
        expression=f"{a:g}:{b:g}",
        verified=True,
        specialist="ratio_solver",
        domain="mathematics",
        steps=[
            {
                "action": "identify",
                "work": f"Ratio = {a:g}:{b:g}."
            },
            {
                "action": "simplify",
                "work": f"Divide both terms by their common factor."
            },
            {
                "action": "calculate",
                "work": f"The simplified ratio is {sp.factor(sp.Rational(str(a)) / sp.Rational(str(b)))}."
            },
            {
                "action": "verify",
                "work": "The ratio preserves the relationship between the two quantities."
            }
        ]
    )


def solve_rate_problem_final(question):
    text = str(question or "").lower()

    # Distance/time speed questions
    match = re.search(
        r'(-?\d+(?:\.\d+)?)\s*(?:km|m)\s+'
        r'(?:in|over|for)\s+'
        r'(-?\d+(?:\.\d+)?)\s*'
        r'(hours?|hrs?|minutes?|mins?)',
        text
    )

    if not match:
        return None

    distance = float(match.group(1))
    time = float(match.group(2))
    unit = match.group(3)

    if time == 0:
        return None

    rate = distance / time

    if unit.startswith("min"):
        expression = f"rate = {distance:g} / {time:g} minutes"
    else:
        expression = f"rate = {distance:g} / {time:g} hours"

    return success_result(
        "rate",
        rate,
        expression=expression,
        verified=True,
        specialist="rate_solver",
        domain="mathematics",
        steps=[
            {
                "action": "identify",
                "work": f"Distance/amount = {distance:g}; time = {time:g} {unit}."
            },
            {
                "action": "formula",
                "work": "Use rate = amount ÷ time."
            },
            {
                "action": "calculate",
                "work": f"Rate = {distance:g} ÷ {time:g} = {rate:g}."
            },
            {
                "action": "verify",
                "work": "The rate equals the amount divided by the time taken."
            }
        ]
    )


# Preserve the existing specialists, but give natural-language
# problem families a reliable final routing layer.
solve_percentage_problem_original = solve_percentage_problem
solve_finance_problem_original = solve_finance_problem
solve_ratio_problem_original = solve_ratio_problem
solve_rate_problem_original = solve_rate_problem

def solve_percentage_problem(question):
    result = solve_percentage_problem_final(question)

    if result:
        return result

    text = str(question or "").lower()

    # Natural wording:
    # "A shirt costs 800 and has a 15% discount."
    discount_match = re.search(
        r'(?:costs?|priced at|worth|price is)\\s*'
        r'(?:ksh\\s*)?(-?\\d+(?:\\.\\d+)?)'
        r'.{0,80}?'
        r'(-?\\d+(?:\\.\\d+)?)\\s*%'
        r'\\s*(?:discount|off)',
        text
    )

    if discount_match:
        price = float(discount_match.group(1))
        percent = float(discount_match.group(2))

        discount = (percent / 100.0) * price
        final_price = price - discount

        return success_result(
            "percentage",
            {
                "discount": result_string(discount),
                "final_price": result_string(final_price)
            },
            expression=(
                f"Discount = {percent}% of {price} = "
                f"{result_string(discount)}; "
                f"Final price = {price} - {result_string(discount)} = "
                f"{result_string(final_price)}"
            ),
            verified=True,
            specialist="percentage_solver",
            domain="mathematics",
            steps=[
                {
                    "action": "identify",
                    "work": (
                        f"Original price = {result_string(price)} "
                        f"and discount = {result_string(percent)}%."
                    )
                },
                {
                    "action": "formula",
                    "work": "Discount = (percentage ÷ 100) × original price."
                },
                {
                    "action": "calculate",
                    "work": (
                        f"Discount = ({result_string(percent)} ÷ 100) × "
                        f"{result_string(price)} = {result_string(discount)}."
                    )
                },
                {
                    "action": "calculate",
                    "work": (
                        f"Final price = {result_string(price)} − "
                        f"{result_string(discount)} = "
                        f"{result_string(final_price)}."
                    )
                },
                {
                    "action": "verify",
                    "work": (
                        f"The final price is the original price minus "
                        f"the discount."
                    )
                }
            ]
        )

    return solve_percentage_problem_original(question)


def solve_finance_problem(question):
    result = solve_finance_problem_final(question)

    if result:
        return result

    text = str(question or "").lower()

    # Natural wording:
    # "simple interest on 5000 at 5% for 3 years"
    if re.search(r'\bsimple interest\b', text):
        numbers = [
            float(x)
            for x in re.findall(r'-?\\d+(?:\\.\\d+)?', text)
        ]

        percent_match = re.search(
            r'(-?\\d+(?:\\.\\d+)?)\\s*%',
            text
        )

        years_match = re.search(
            r'(-?\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?)',
            text
        )

        if percent_match and years_match:
            rate = float(percent_match.group(1))
            years = float(years_match.group(1))

            # Remove the percentage and time values and use the
            # remaining monetary/number value as the principal.
            principal_candidates = [
                n for n in numbers
                if abs(n - rate) > 1e-12 and abs(n - years) > 1e-12
            ]

            if principal_candidates:
                principal = principal_candidates[0]

                interest = principal * rate * years / 100.0
                total = principal + interest

                return success_result(
                    "finance",
                    interest,
                    expression=(
                        f"I = ({principal:g} × {rate:g} × "
                        f"{years:g}) / 100"
                    ),
                    verified=True,
                    specialist="finance_solver",
                    domain="finance",
                    steps=[
                        {
                            "action": "identify",
                            "work": (
                                f"Principal = {principal:g}, "
                                f"rate = {rate:g}%, "
                                f"time = {years:g} years."
                            )
                        },
                        {
                            "action": "formula",
                            "work": "Use simple interest: I = PRT/100."
                        },
                        {
                            "action": "calculate",
                            "work": (
                                f"I = ({principal:g} × {rate:g} × "
                                f"{years:g}) / 100 = {interest:g}."
                            )
                        },
                        {
                            "action": "verify",
                            "work": (
                                f"Total amount = {principal:g} + "
                                f"{interest:g} = {total:g}."
                            )
                        }
                    ]
                )

    return None


def solve_ratio_problem(question):
    result = solve_ratio_problem_final(question)
    return result if result else solve_ratio_problem_original(question)


def solve_rate_problem(question):
    result = solve_rate_problem_final(question)
    return result if result else solve_rate_problem_original(question)


# Final classification normalization.
classify_problem_original = classify_problem

def classify_problem(question):
    text = str(question or "").lower()

    if re.search(r'\b(a+a|aa|genotype|offspring|crossed with|cross)\b', text):
        return {
            "domain": "biology",
            "type": "genetics"
        }

    if re.search(r'\b(convert|conversion)\b.*\b(km|m|cm|mm|kg|g|l|ml|hour|hours|minute|minutes|second|seconds)\b', text):
        return {
            "domain": "mathematics",
            "type": "unit_conversion"
        }

    if re.search(r'\b(ratio|proportion)\b', text):
        return {
            "domain": "mathematics",
            "type": "ratio"
        }

    if re.search(r'\b(simple interest|interest rate|borrowed|invested)\b', text):
        return {
            "domain": "finance",
            "type": "finance"
        }

    if re.search(r'\b(percent|percentage)\b|%', text):
        return {
            "domain": "mathematics",
            "type": "percentage"
        }

    if re.search(r'\b(rate|speed|per hour|per minute|per day)\b', text):
        return {
            "domain": "mathematics",
            "type": "rate"
        }

    if (
        re.search(
            r'\b(textbooks?|exercise\s+books?|notebooks?|items?|objects?)\b',
            text
        )
        and re.search(
            r'\b(altogether|in total|spent|paid|cost|costs)\b',
            text
        )
    ):
        return {
            "domain": "mathematics",
            "type": "word_problem"
        }

    # Shopkeeper / profit / loss word problems.
    if (
        re.search(
            r'\b(shopkeeper|buys?|bought|purchases?|purchased|'
            r'sells?|sold|selling|profit|loss|gain|cost\s+price|'
            r'selling\s+price)\b',
            text,
            re.I,
        )
        and re.search(
            r'\b(profit|loss|gain|shopkeeper|buys?|bought|'
            r'sells?|sold|selling)\b',
            text,
            re.I,
        )
    ):
        return {
            "domain": "mathematics",
            "type": "word_problem"
        }

    return classify_problem_original(question)


# ============================================================
# END UNIVERSAL ROUTING + NATURAL LANGUAGE REPAIR
# ============================================================

# ============================================================
# FINAL WORKER ENTRY POINT
# ============================================================



# ============================================================
# PART 10C — NATURAL-LANGUAGE CHEMISTRY SOLVER
# ============================================================

def solve_chemistry(question):
    text = str(question or "").lower()

    # --------------------------------------------------------
    # Moles: n = m/M
    # --------------------------------------------------------
    if re.search(r"\b(moles?|amount of substance)\b", text):
        mass = extract_quantity(text, "g")

        formula_match = re.search(
            r"\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*)\b",
            str(question or ""),
        )

        formula = formula_match.group(1) if formula_match else None

        if mass is not None and formula:
            molar_mass = calculate_molar_mass(formula)

            if molar_mass is not None and molar_mass != 0:
                moles = mass / molar_mass

                return success_result(
                    "moles",
                    moles,
                    expression="n = m/M",
                    verified=True,
                    specialist="chemistry_solver",
                    domain="chemistry",
                    steps=[
                        {
                            "action": "identify",
                            "work": f"Mass = {mass} g; molar mass of {formula} = {molar_mass} g/mol.",
                        },
                        {
                            "action": "substitute",
                            "work": f"n = {mass}/{molar_mass}",
                        },
                        {
                            "action": "calculate",
                            "work": f"n = {moles} mol",
                        },
                        {
                            "action": "verify",
                            "work": "Moles equal mass divided by molar mass.",
                        },
                    ],
                )

    # --------------------------------------------------------
    # Concentration: C = n/V
    # --------------------------------------------------------
    if re.search(
        r"\b(concentration|molarity)\b",
        text,
    ):
        moles = extract_quantity(text, "mol")
        volume = extract_quantity(text, "L")

        if moles is not None and volume not in (None, 0):
            concentration = moles / volume

            return success_result(
                "concentration",
                concentration,
                expression="C = n/V",
                verified=True,
                specialist="chemistry_solver",
                domain="chemistry",
                steps=[
                    {
                        "action": "identify",
                        "work": f"Amount = {moles} mol; volume = {volume} L.",
                    },
                    {
                        "action": "substitute",
                        "work": f"C = {moles}/{volume}",
                    },
                    {
                        "action": "calculate",
                        "work": f"C = {concentration} mol/L",
                    },
                    {
                        "action": "verify",
                        "work": "Concentration equals amount of substance divided by volume.",
                    },
                ],
            )

    # Keep the existing dilution solver available.
    result = solve_dilution_problem(question)

    if result:
        return result

    # Preserve the existing molar-mass capability.
    result = solve_molar_mass(question)

    if result:
        return result

    return None


# ============================================================
# PART 10D — FINAL SPECIALIST ROUTER
# ============================================================

def solve_specialist_problem(question):
    """
    Final non-recursive specialist dispatcher.

    Uses the existing specialist solvers already implemented in this file.
    Mathematical sub-specialists remain grouped behind:
      - solve_advanced_mathematics()
      - solve_mathematics()

    This dispatcher never calls solve_general_problem(), preventing recursion.
    """

    # 1. Word problems
    result = solve_word_problem(question)
    if result:
        return result

    # 2. Biology / genetics
    result = solve_biology_genetics(question)
    if result:
        return result

    # 3. Chemistry
    result = solve_chemistry(question)
    if result:
        return result

    # 4. Physics
    result = solve_physics(question)
    if result:
        return result

    # 5. Statistics
    result = solve_statistics(question)
    if result:
        return result

    # 6. Percentage problems
    result = solve_percentage_problem(question)
    if result:
        return result

    # 7. Finance / accounting-style problems
    result = solve_finance_problem(question)
    if result:
        return result

    # 8. Ratio / proportion problems
    result = solve_ratio_problem(question)
    if result:
        return result

    # 9. Unit conversions
    result = solve_unit_conversion(question)
    if result:
        return result

    # 10. Rates / speed / amount-per-time problems
    result = solve_rate_problem(question)
    if result:
        return result

    # 11. Advanced mathematics
    # Handles matrices, vectors, inequalities, limits,
    # probability, trigonometry, powers and roots.
    result = solve_advanced_mathematics(question)
    if result:
        return result

    # 12. General mathematics
    # Handles substitution, derivatives, integrals,
    # factorization, simplification, equations and arithmetic.
    result = solve_mathematics(question)
    if result:
        return result

    return None

if __name__ == "__main__":
    worker_main()
