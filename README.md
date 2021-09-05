
# ICQL-DBA Plugin: Catalog

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Purpose](#purpose)
- [Notes](#notes)
- [Flags in Function Table](#flags-in-function-table)
  - [CAPI3REF: Function Flags](#capi3ref-function-flags)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Purpose

Provides views detailing the structure of an SQLite DB

## Notes


Items to be cataloged:

* `prg`—pragmas
* `fun`—functions
* `scm`—schemas (databases)
* `tbl`—tables
* `col`—columns
* `idx`—indexes
* `pk`— primary keys
* `fk`— foreign keys
* `cll`—collations
* `mod`—modules

## Flags in Function Table

`flags` column in table returned by `pragma_function_list` (found in the [SQLite GitHub
mirror](https://github.com/sqlite/sqlite/blob/37d4ec86bfa78c31732132b7729b8ce0e47da891/doc/trusted-schema.md)):


> The basic idea is to tag every SQL function and virtual table with one of three risk levels:
>
> * Innocuous
> * Normal
> * Direct-Only
>
> Innocuous functions/vtabs are safe and can be used at any time. Direct-only elements, in contrast, might
> have cause side-effects and should only be used from top-level SQL, not from within triggers or views nor
> in elements of the schema such as CHECK constraint, DEFAULT values, generated columns, index expressions,
> or in the WHERE clause of a partial index that are potentially under the control of an attacker. Normal
> elements behave like Innocuous if TRUSTED_SCHEMA=on and behave like direct-only if TRUSTED_SCHEMA=off.
>
> Application-defined functions and virtual tables go in as Normal unless the application takes deliberate
> steps to change the risk level.
>
>
> flags → Bitmask of
> * SQLITE_INNOCUOUS,
> * SQLITE_DIRECTONLY,      `(flags & 0x80000)!=0`
> * SQLITE_DETERMINISTIC,
> * SQLITE_SUBTYPE, and
> * SQLITE_FUNC_INTERNAL
> flags.

From `sqlite-snapshot-202107191400/sqlite3.c`:

```c
#define SQLITE_DETERMINISTIC    0x000000800
#define SQLITE_DIRECTONLY       0x000080000
#define SQLITE_SUBTYPE          0x000100000
#define SQLITE_INNOCUOUS        0x000200000
```

From `sqlite-snapshot-202107191400/sqlite3.c`:

### CAPI3REF: Function Flags

These constants may be ORed together with the
[SQLITE_UTF8 | preferred text encoding] as the fourth argument
to [sqlite3_create_function()], [sqlite3_create_function16()], or
[sqlite3_create_function_v2()].

<dl>
<dt>SQLITE_DETERMINISTIC</dt><dd>
The SQLITE_DETERMINISTIC flag means that the new function always gives
the same output when the input parameters are the same.
The [abs|abs() function] is deterministic, for example, but
[randomblob|randomblob()] is not.  Functions must
be deterministic in order to be used in certain contexts such as
with the WHERE clause of [partial indexes] or in [generated columns].
SQLite might also optimize deterministic functions by factoring them
out of inner loops.
</dd>

<dt>SQLITE_DIRECTONLY</dt><dd>
The SQLITE_DIRECTONLY flag means that the function may only be invoked
from top-level SQL, and cannot be used in VIEWs or TRIGGERs nor in
schema structures such as [CHECK constraints], [DEFAULT clauses],
[expression indexes], [partial indexes], or [generated columns].
The SQLITE_DIRECTONLY flags is a security feature which is recommended
for all [application-defined SQL functions], and especially for functions
that have side-effects or that could potentially leak sensitive
information.
</dd>

<dt>SQLITE_INNOCUOUS</dt><dd>
The SQLITE_INNOCUOUS flag means that the function is unlikely
to cause problems even if misused.  An innocuous function should have
no side effects and should not depend on any values other than its
input parameters. The [abs|abs() function] is an example of an
innocuous function.
The [load_extension() SQL function] is not innocuous because of its
side effects.
<p> SQLITE_INNOCUOUS is similar to SQLITE_DETERMINISTIC, but is not
exactly the same.  The [random|random() function] is an example of a
function that is innocuous but not deterministic.
<p>Some heightened security settings
([SQLITE_DBCONFIG_TRUSTED_SCHEMA] and [PRAGMA trusted_schema=OFF])
disable the use of SQL functions inside views and triggers and in
schema structures such as [CHECK constraints], [DEFAULT clauses],
[expression indexes], [partial indexes], and [generated columns] unless
the function is tagged with SQLITE_INNOCUOUS.  Most built-in functions
are innocuous.  Developers are advised to avoid using the
SQLITE_INNOCUOUS flag for application-defined functions unless the
function has been carefully audited and found to be free of potentially
security-adverse side-effects and information-leaks.
</dd>

<dt>SQLITE_SUBTYPE</dt><dd>
The SQLITE_SUBTYPE flag indicates to SQLite that a function may call
[sqlite3_value_subtype()] to inspect the sub-types of its arguments.
Specifying this flag makes no difference for scalar or aggregate user
functions. However, if it is not specified for a user-defined window
function, then any sub-types belonging to arguments passed to the window
function may be discarded before the window function is called (i.e.
sqlite3_value_subtype() will always return 0).
</dd>
</dl>

* The SQLITE_INNOCUOUS flag is the same bit as SQLITE_FUNC_UNSAFE.  But the meaning is inverted.  So flip
  the bit.

```c
  extraFlags = enc &  (SQLITE_DETERMINISTIC|SQLITE_DIRECTONLY|
                       SQLITE_SUBTYPE|SQLITE_INNOCUOUS);
  enc &= (SQLITE_FUNC_ENCMASK|SQLITE_ANY);
```

* `SQLITE_FUNC_ENCMASK`
* `SQLITE_ANY`

```c
/*
** Possible values for FuncDef.flags.  Note that the _LENGTH and _TYPEOF
** values must correspond to OPFLAG_LENGTHARG and OPFLAG_TYPEOFARG.  And
** SQLITE_FUNC_CONSTANT must be the same as SQLITE_DETERMINISTIC.  There
** are assert() statements in the code to verify this.
**
** Value constraints (enforced via assert()):
**     SQLITE_FUNC_MINMAX      ==  NC_MinMaxAgg      == SF_MinMaxAgg
**     SQLITE_FUNC_ANYORDER    ==  NC_OrderAgg       == SF_OrderByReqd
**     SQLITE_FUNC_LENGTH      ==  OPFLAG_LENGTHARG
**     SQLITE_FUNC_TYPEOF      ==  OPFLAG_TYPEOFARG
**     SQLITE_FUNC_CONSTANT    ==  SQLITE_DETERMINISTIC from the API
**     SQLITE_FUNC_DIRECT      ==  SQLITE_DIRECTONLY from the API
**     SQLITE_FUNC_UNSAFE      ==  SQLITE_INNOCUOUS
**     SQLITE_FUNC_ENCMASK   depends on SQLITE_UTF* macros in the API
*/
#define SQLITE_FUNC_ENCMASK  0x0003 /* SQLITE_UTF8, SQLITE_UTF16BE or UTF16LE */
#define SQLITE_FUNC_LIKE     0x0004 /* Candidate for the LIKE optimization */
#define SQLITE_FUNC_CASE     0x0008 /* Case-sensitive LIKE-type function */
#define SQLITE_FUNC_EPHEM    0x0010 /* Ephemeral.  Delete with VDBE */
#define SQLITE_FUNC_NEEDCOLL 0x0020 /* sqlite3GetFuncCollSeq() might be called*/
#define SQLITE_FUNC_LENGTH   0x0040 /* Built-in length() function */
#define SQLITE_FUNC_TYPEOF   0x0080 /* Built-in typeof() function */
#define SQLITE_FUNC_COUNT    0x0100 /* Built-in count(*) aggregate */
/*                           0x0200 -- available for reuse */
#define SQLITE_FUNC_UNLIKELY 0x0400 /* Built-in unlikely() function */
#define SQLITE_FUNC_CONSTANT 0x0800 /* Constant inputs give a constant output */
#define SQLITE_FUNC_MINMAX   0x1000 /* True for min() and max() aggregates */
#define SQLITE_FUNC_SLOCHNG  0x2000 /* "Slow Change". Value constant during a
                                    ** single query - might change over time */
#define SQLITE_FUNC_TEST     0x4000 /* Built-in testing functions */
#define SQLITE_FUNC_OFFSET   0x8000 /* Built-in sqlite_offset() function */
#define SQLITE_FUNC_WINDOW   0x00010000 /* Built-in window-only function */
#define SQLITE_FUNC_INTERNAL 0x00040000 /* For use by NestedParse() only */
#define SQLITE_FUNC_DIRECT   0x00080000 /* Not for use in TRIGGERs or VIEWs */
#define SQLITE_FUNC_SUBTYPE  0x00100000 /* Result likely to have sub-type */
#define SQLITE_FUNC_UNSAFE   0x00200000 /* Function has side effects */
#define SQLITE_FUNC_INLINE   0x00400000 /* Functions implemented in-line */
#define SQLITE_FUNC_ANYORDER 0x08000000 /* count/min/max aggregate */
```




