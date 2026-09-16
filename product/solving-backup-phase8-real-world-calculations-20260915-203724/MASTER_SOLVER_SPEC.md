# DREAM EDUCATION — ALL PROBLEMS SOLVER
## MASTER SOLVER SPECIFICATION
## Version 1 — Independent Solving Foundation

RULES
1. This is a specialist solving system, not a generic solver.
2. Existing solver/source files are not modified by this specification.
3. Wolfram/WolframAlpha is completely excluded.
4. Local deterministic/open-source computation is preferred.
5. External data sources provide evidence/data, not blind answers.
6. Every computed answer must pass verification before teaching.
7. Unsupported specialist cases may use the emergency Special Problem Solver only after specialist failure.
8. Emergency results must also pass verification.
9. Multiple valid solution methods should be supported where practical.
10. Speed and accuracy are primary system requirements.

==================================================
A. CORE ARCHITECTURE
==================================================

USER PROBLEM
  -> ANALYZER
  -> DOMAIN DETECTION
  -> PROBLEM TYPE DETECTION
  -> VARIABLE/DATA EXTRACTION
  -> SPECIALIST ROUTER
  -> PRIMARY SOLVER
  -> SECONDARY SOLVER / CROSS-CHECK
  -> INDEPENDENT VERIFIER
  -> SOLUTION FORMATTER
  -> VERIFIED SOLUTION
  -> DREAM EDUCATION TEACHING

==================================================
B. MATHEMATICS
==================================================

1. Arithmetic
   - addition
   - subtraction
   - multiplication
   - division
   - fractions
   - decimals
   - percentages
   - ratios
   - proportions
   - powers
   - roots
   - scientific notation
   - significant figures

2. Algebra
   - linear equations
   - simultaneous equations
   - quadratic equations
   - polynomial equations
   - inequalities
   - absolute value
   - rational equations
   - exponential equations
   - logarithmic equations
   - systems of equations
   - expression simplification
   - factorization
   - expansion
   - substitution

3. Functions
   - linear
   - quadratic
   - polynomial
   - rational
   - exponential
   - logarithmic
   - trigonometric
   - inverse functions
   - composition
   - transformations

4. Geometry
   - angles
   - triangles
   - quadrilaterals
   - polygons
   - circles
   - perimeter
   - area
   - surface area
   - volume
   - similarity
   - congruence
   - coordinate geometry
   - 3D geometry

5. Trigonometry
   - sine
   - cosine
   - tangent
   - identities
   - equations
   - inverse trigonometry
   - bearings
   - heights and distances

6. Calculus
   - limits
   - continuity
   - differentiation
   - applications of derivatives
   - optimization
   - integration
   - definite integrals
   - differential equations
   - numerical calculus

7. Linear Algebra
   - vectors
   - matrices
   - determinants
   - matrix equations
   - eigenvalues
   - eigenvectors
   - linear transformations

8. Discrete Mathematics
   - sets
   - relations
   - functions
   - logic
   - combinatorics
   - permutations
   - combinations
   - recurrence
   - graph theory
   - discrete probability

9. Number Theory
   - primes
   - factors
   - divisibility
   - gcd/lcm
   - modular arithmetic
   - congruences
   - integer equations

10. Numerical Mathematics
   - root finding
   - interpolation
   - numerical integration
   - numerical differentiation
   - approximation
   - iterative methods

PRIMARY LOCAL COMPONENTS:
- SymPy
- mpmath
- deterministic algorithms

SECONDARY:
- compatible scientific/numerical libraries when justified

VERIFICATION:
- symbolic simplification
- substitution
- numerical evaluation
- alternative formula/method
- domain checks

==================================================
C. PHYSICS
==================================================

1. Mechanics
   - displacement
   - velocity
   - acceleration
   - kinematics
   - Newton laws
   - friction
   - forces
   - momentum
   - impulse
   - work
   - energy
   - power
   - circular motion
   - gravitation

2. Fluids
   - density
   - pressure
   - buoyancy
   - fluid flow

3. Thermal Physics
   - temperature
   - heat
   - specific heat
   - latent heat
   - thermal expansion
   - gas laws
   - thermodynamics

4. Waves
   - frequency
   - wavelength
   - speed
   - period
   - sound
   - resonance

5. Optics
   - reflection
   - refraction
   - lenses
   - mirrors
   - image formation

6. Electricity
   - charge
   - current
   - voltage
   - resistance
   - Ohm law
   - power
   - energy
   - series circuits
   - parallel circuits
   - Kirchhoff laws

7. Magnetism
   - magnetic force
   - fields
   - induction
   - electromagnetism

8. Modern Physics
   - photons
   - atomic physics
   - nuclear physics
   - radioactivity
   - mass-energy

VERIFICATION:
- equation consistency
- numerical recalculation
- dimensional analysis
- unit consistency
- physical-range checks

==================================================
D. CHEMISTRY
==================================================

1. Foundations
   - atomic mass
   - molecular mass
   - formula interpretation
   - chemical quantities

2. Reactions
   - equation balancing
   - stoichiometry
   - limiting reagent
   - theoretical yield
   - percentage yield

3. Solutions
   - molarity
   - molality
   - concentration
   - dilution
   - mixtures

4. Gases
   - Boyle
   - Charles
   - combined gas law
   - ideal gas calculations

5. Acids/Bases
   - pH
   - pOH
   - concentration
   - neutralization

6. Thermochemistry
   - heat
   - enthalpy
   - calorimetry

7. Equilibrium
   - equilibrium expressions
   - equilibrium calculations

8. Electrochemistry
   - oxidation/reduction
   - electrochemical cells
   - Faraday calculations

9. Organic Chemistry
   - formulas
   - molecular properties
   - reaction calculations

DATA/EVIDENCE SOURCES:
- PubChem
- NCBI resources
- appropriate scientific literature

VERIFICATION:
- atom conservation
- charge conservation
- independent arithmetic
- formula/molar-mass recalculation
- dimensional checks

==================================================
E. BIOLOGY / LIFE SCIENCE
==================================================

1. Cell biology
2. Genetics
3. Mendelian inheritance
4. Probability in inheritance
5. Molecular biology
6. Physiology
7. Ecology
8. Population biology
9. Evolution
10. Biodiversity
11. Experimental biology
12. Biological measurements
13. Biological statistics
14. Growth calculations
15. Population calculations

VERIFICATION:
- biological constraints
- numerical checks
- source comparison
- evidence provenance

==================================================
F. STATISTICS & DATA
==================================================

1. Descriptive statistics
   - mean
   - median
   - mode
   - range
   - variance
   - standard deviation
   - quartiles
   - percentiles

2. Probability
   - conditional probability
   - independence
   - Bayes
   - distributions

3. Statistical inference
   - sampling
   - confidence intervals
   - hypothesis testing
   - p-values

4. Relationships
   - covariance
   - correlation
   - regression

5. Data processing
   - cleaning
   - filtering
   - grouping
   - transformation
   - aggregation

6. Advanced data
   - time series
   - outlier detection
   - forecasting
   - numerical analysis

VERIFICATION:
- independent recomputation
- formula cross-check
- range checks
- sample-size checks

==================================================
G. UNITS / MEASUREMENT
==================================================

- SI units
- metric units
- imperial units
- length
- mass
- time
- temperature
- area
- volume
- speed
- acceleration
- force
- pressure
- energy
- power
- density
- concentration
- compound units
- dimensional analysis
- significant figures
- uncertainty
- measurement error

VERIFICATION:
- dimensional consistency
- reversible conversion
- independent conversion calculation

==================================================
H. FINANCE / ACCOUNTING
==================================================

- simple interest
- compound interest
- loans
- amortization
- annuities
- present value
- future value
- investment return
- depreciation
- profit/loss
- margins
- markup
- discount
- tax arithmetic
- budgets
- cash flow
- break-even
- accounting equation
- financial ratios

VERIFICATION:
- independent Decimal calculation
- repayment reconstruction
- balance checks
- cash-flow consistency

==================================================
I. ECONOMICS / BUSINESS
==================================================

- supply/demand
- elasticity
- revenue
- cost
- profit
- marginal cost
- marginal revenue
- break-even
- growth
- forecasting
- business ratios
- optimization

==================================================
J. ENGINEERING
==================================================

CIVIL:
- area
- volume
- quantities
- loads
- basic structural calculations
- surveying calculations
- construction calculations

MECHANICAL:
- force
- torque
- work
- power
- pressure
- motion
- mechanical systems

ELECTRICAL:
- Ohm law
- power
- energy
- resistance
- series
- parallel
- Kirchhoff

CHEMICAL:
- mass balance
- energy balance
- flow
- concentration
- reaction calculations

RULE:
Educational calculations only unless professional safety/certification requirements are explicitly supported.

==================================================
K. PROGRAMMING / CODE
==================================================

LANGUAGES:
- Python
- JavaScript
- TypeScript
- Java
- C
- C++
- C#
- Go
- Rust
- PHP
- Ruby
- SQL
- HTML
- CSS
- Bash
- JSON
- YAML

PROBLEM TYPES:
- syntax
- parsing
- debugging
- algorithms
- data structures
- complexity
- code transformation
- code explanation
- testing
- static analysis
- logic errors
- runtime errors
- configuration errors

TOOLS:
- language parsers
- Tree-sitter where useful
- local execution/testing where safe
- deterministic analysis
- documentation/evidence sources

VERIFICATION:
- parse
- execute safe tests
- expected-output tests
- edge cases
- static checks

==================================================
L. COMPUTER SCIENCE
==================================================

- algorithms
- data structures
- Big-O
- Boolean algebra
- binary
- hexadecimal
- number systems
- graphs
- databases
- SQL
- networking
- operating systems
- memory
- CPU concepts
- automata
- information theory
- cryptographic mathematics

==================================================
M. OPTIMIZATION / OPERATIONS RESEARCH
==================================================

- linear programming
- integer programming
- assignment
- transportation
- scheduling
- routing
- allocation
- packing
- constraints
- network optimization

==================================================
N. LOGIC / REASONING
==================================================

- propositions
- truth tables
- Boolean logic
- logical equivalence
- inference
- syllogisms
- constraints
- sequence reasoning
- structured puzzles
- graph reasoning

==================================================
O. WORD PROBLEMS
==================================================

PROCESS:
1. extract quantities
2. identify units
3. identify variables
4. identify relationships
5. classify domain
6. construct model
7. route to specialist
8. solve
9. substitute result into original wording
10. verify

SUPPORTED CROSS-DOMAIN EXAMPLES:
- rate/time/distance
- work/rate
- mixture
- percentage
- finance
- geometry
- physics
- chemistry
- agriculture
- business

==================================================
P. AGRICULTURE
==================================================

- land area
- planting density
- seed requirements
- fertilizer quantity
- fertilizer cost
- yield
- yield percentage
- farm budgeting
- livestock calculations
- feed ratios
- production rates
- agricultural statistics

==================================================
Q. GEOGRAPHY / EARTH SCIENCE
==================================================

- map scale
- distance
- coordinates
- gradient
- area
- population density
- demographic calculations
- rainfall
- temperature
- geological measurements
- environmental data

==================================================
R. ENVIRONMENTAL SCIENCE
==================================================

- population
- resource consumption
- water calculations
- energy use
- pollution measurements
- carbon calculations
- environmental statistics
- ecological ratios

==================================================
S. ASTRONOMY / SPACE SCIENCE
==================================================

- distance
- velocity
- orbital calculations
- gravity
- planetary data
- astronomical units
- time systems
- basic astrophysics

==================================================
T. RESEARCH / KNOWLEDGE
==================================================

- factual research
- definitions
- scientific literature
- paper discovery
- evidence comparison
- source verification
- references
- conflicting claims
- current scientific information

POTENTIAL SOURCES:
- OpenAlex
- Crossref
- arXiv
- NCBI
- Europe PMC
- domain-specific authoritative databases

RULE:
Research sources provide evidence. They do not automatically become trusted answers.

==================================================
U. TECHNICAL TROUBLESHOOTING
==================================================

- software errors
- configuration problems
- programming errors
- networking problems
- system diagnostics
- documented equipment problems

PROCESS:
symptom -> system -> hypotheses -> diagnostic test -> fix -> verification

==================================================
V. REAL-WORLD CALCULATIONS
==================================================

- transport
- fuel
- electricity
- construction
- shopping
- budgeting
- cooking/mixtures
- wages
- agriculture
- business
- household measurements
- time/rate problems
- population
- energy
- material quantities

==================================================
W. CROSS-DOMAIN PROBLEMS
==================================================

A problem may activate multiple specialists.

Example:
AGRICULTURE + MATHEMATICS + FINANCE + UNITS

Example:
PHYSICS + MATHEMATICS + UNITS

Example:
CHEMISTRY + MATHEMATICS + DATABASE

Example:
PROGRAMMING + COMPUTER SCIENCE + TESTING

The analyzer must be able to return:
- primary domain
- secondary domains
- problem family
- subtype
- required capabilities

==================================================
X. SOLVER ROLE TYPES
==================================================

LOCAL_DETERMINISTIC
- preferred for exact calculations

SYMBOLIC
- preferred for symbolic mathematics

NUMERICAL
- preferred for numerical approximation

DOMAIN_SPECIALIST
- applies domain-specific equations/rules

DATA_SOURCE
- supplies factual scientific/domain data

EVIDENCE_SOURCE
- supplies literature/references

PARSER
- interprets structured technical input

EXECUTOR
- safely tests executable code

CROSSCHECKER
- independently computes or derives the result

VERIFIER
- decides whether the result is acceptable

==================================================
Y. VERIFICATION CONTRACT
==================================================

NO RESULT IS TEACHABLE UNTIL VERIFIED.

Possible checks:
- symbolic equivalence
- substitution
- independent recalculation
- alternative formula
- numerical approximation
- unit consistency
- dimensional consistency
- domain constraints
- range checks
- conservation laws
- source agreement
- reproducible execution
- expected-output tests
- reverse calculation

Verification result:
PASS
FAIL
INCONCLUSIVE

INCONCLUSIVE MUST NOT BE PRESENTED AS VERIFIED.

==================================================
Z. EMERGENCY FALLBACK
==================================================

Only after:
1. analyzer succeeds
2. appropriate specialists attempted
3. local/open-source methods fail or are unsupported

Then:
SPECIAL PROBLEM SOLVER

Its output must still pass:
- independent verification
- source/evidence checks where applicable
- consistency checks

If verification fails:
DO NOT TEACH THE RESULT AS FACT.

==================================================
AA. SOURCE POLICY
==================================================

Sources must be assigned by role.

Never:
- send every problem to every source
- treat search results as calculations
- treat an API response as automatically correct
- make an external source the core computational engine when a reliable local algorithm exists

Preferred hierarchy:
1. local deterministic solver
2. local open-source specialist
3. relevant authoritative data source
4. independent cross-check
5. emergency external solver

==================================================
AB. CURRENT FREE COMPONENT CANDIDATES
==================================================

CORE:
- SymPy
- mpmath

NUMERICAL/SCIENTIFIC:
- SciPy, only if compatible and worthwhile on target ARMv7 environment

CHEMISTRY/BIOLOGY DATA:
- PubChem
- NCBI
- Europe PMC

RESEARCH:
- OpenAlex
- Crossref
- arXiv
- other relevant scholarly sources

PROGRAMMING:
- Tree-sitter
- language-specific parsers/tools where practical

UNITS:
- own deterministic conversion/dimensional engine first
- external/open-source unit library only if it materially improves coverage

OPTIMIZATION:
- deterministic algorithms first
- compatible open-source optimization libraries where practical

IMPORTANT:
Every candidate must be tested for:
- ARMv7 compatibility
- Python 3.14 compatibility
- installation size
- speed
- maintenance
- license
- offline usefulness
- network dependency
- reliability

NO BLIND MASS INSTALLATION.

==================================================
AC. STANDARD SOLUTION OBJECT
==================================================

{
  success: true,
  solved: true,
  routed: true,
  domain: "...",
  domains: [],
  type: "...",
  subtype: "...",
  specialist: "...",
  solver: "...",
  method: "...",
  result: "...",
  expression: "...",
  units: "...",
  steps: [],
  verification: {
    status: "PASS",
    checks: [],
    cross_checked: true
  },
  evidence: [],
  confidence: "...",
  error: null
}

==================================================
AD. BUILD ORDER
==================================================

PHASE 1
- master taxonomy
- capability registry
- solver registry
- source registry
- verification registry

PHASE 2
- analyzer
- classifier
- router

PHASE 3
- mathematics specialists
- units specialist
- finance specialist
- physics specialists
- chemistry specialists
- statistics/data specialists

PHASE 4
- biology
- engineering
- programming
- computer science
- optimization
- agriculture
- geography/environment
- research

PHASE 5
- cross-domain problem decomposition
- word-problem engine
- technical troubleshooting

PHASE 6
- independent verifier
- cross-check engine
- failure handling
- emergency fallback

PHASE 7
- comprehensive test suite

PHASE 8
- compatibility adapter
- ONLY THEN connect to server.js

==================================================
AE. SERVER INTEGRATION RULE
==================================================

The new solving layer must remain independent until it passes its own tests.

server.js must not be changed during construction.

At integration time the adapter should preserve the existing solveProblem()
contract so the existing Dream Education adaptive/teaching architecture is
not unnecessarily rewritten.

==================================================
AF. NON-NEGOTIABLE REQUIREMENTS
==================================================

- speed
- accuracy
- verification
- explainable steps
- specialist routing
- independent cross-checking
- broad practical coverage
- low cost
- open/free components where practical
- no Wolfram
- no blind source aggregation
- no generic solver as primary architecture
- no unverified answers taught to learners
