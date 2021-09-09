(function() {
  'use strict';
  var C, CND, Dba, E, SQL, badge, debug, echo, guy, help, info, isa, rpr, type_of, types, urge, validate, validate_list_of, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA-CATALOG';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_list_of} = types.export());

  // { to_width }              = require 'to-width'
  SQL = String.raw;

  E = require('./errors');

  ({Dba} = require('icql-dba'));

  guy = require('guy');

  //===========================================================================================================
  types.declare('dba', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      }
    }
  });

  types.declare('constructor_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.dba x.dba": function(x) {
        return this.isa.dba(x.dba);
      },
      "@isa.nonempty_text x.prefix": function(x) {
        return this.isa.nonempty_text(x.prefix);
      }
    }
  });

  //===========================================================================================================
  this.Dcat = (function() {
    class Dcat {
      //---------------------------------------------------------------------------------------------------------
      static declare_types(self) {
        self.types.validate.constructor_cfg(self.cfg);
        guy.props.def(self, 'dba', {
          enumerable: false,
          value: self.cfg.dba
        });
        self.cfg = guy.lft.lets(self.cfg, function(d) {
          return delete d.dba;
        });
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        //.......................................................................................................
        guy.cfg.configure_with_types(this, cfg, types);
        this._compile_sql();
        this._create_sql_functions();
        this._create_db_structure();
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_db_structure() {
        var prefix;
        prefix = this.cfg.prefix;
        //-------------------------------------------------------------------------------------------------------
        // OPTIONS
        //.......................................................................................................
        this.dba.execute(SQL`create view ${prefix}compile_time_options as with r1 as ( select
    counter.value                             as idx,
    sqlite_compileoption_get( counter.value ) as facet_txt
  from std_generate_series( 0, 1e3 ) as counter
where facet_txt is not null )
select
    idx                                 as idx,
    prefix                              as key,
    suffix                              as value,
    sqlite_compileoption_used( prefix ) as used
  from r1,
  std_str_split_first( r1.facet_txt, '=' ) as r2
  order by 1;`);
        //-------------------------------------------------------------------------------------------------------
        // FUNCTIONS
        //.......................................................................................................
        this.dba.execute(SQL`create view ${prefix}functions as select
    f.name                                    as fun_name,
    f.builtin                                 as is_builtin,
    f.type                                    as type,
    -- f.enc                                     as enc,
    f.narg                                    as narg,
    f.flags                                   as flags,
    -- xxx_fun_flags_as_text( f.flags )          as tags,
    ${prefix}fun_is_deterministic( f.flags )  as is_deterministic,
    ${prefix}fun_is_innocuous( f.flags )      as is_innocuous,
    ${prefix}fun_is_directonly( f.flags )     as is_directonly
  from pragma_function_list as f
  order by name;`);
        //-------------------------------------------------------------------------------------------------------
        // SUNDRY
        //.......................................................................................................
        this.dba.execute(SQL`create view ${prefix}pragmas      as select * from pragma_pragma_list()      order by name;`);
        this.dba.execute(SQL`create view ${prefix}modules    as
select * from pragma_module_list()      order by name;`);
        this.dba.execute(SQL`create view ${prefix}databases  as
select * from pragma_database_list()    order by name;`);
        this.dba.execute(SQL`create view ${prefix}collations as
select * from pragma_collation_list()   order by name;`);
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _compile_sql() {
        var prefix, sql;
        prefix = this.cfg.prefix;
        sql = {};
        guy.props.def(this, 'sql', {
          enumerable: false,
          value: sql
        });
        /* TAINT may want to cache, although cache key is about as expensive as producing the value itself */
        guy.props.def(sql, 'reltrigs', {
          get: () => {
            return this._get_union_of_sqlite_schema_selects();
          }
        });
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_sql_functions() {
        var bit_pattern, prefix, property, ref;
        this.dba.create_stdlib();
        prefix = this.cfg.prefix;
        //.........................................................................................................
        this.dba.create_function({
          name: prefix + 'fun_flags_as_text',
          deterministic: true,
          varargs: false,
          call: function(flags_int) {
            var R, k, ref, v;
            R = [];
            ref = C.function_flags;
            for (k in ref) {
              v = ref[k];
              if ((flags_int & v) !== 0) {
                R.push(`+${k}`);
              }
            }
            // R.push '+usaf' unless '+inoc' in R
            return R.join('');
          }
        });
        ref = C.function_flags;
        //.........................................................................................................
        for (property in ref) {
          bit_pattern = ref[property];
          ((property, bit_pattern) => {
            return this.dba.create_function({
              name: prefix + 'fun_' + property,
              deterministic: true,
              varargs: false,
              call: function(flags_int) {
                if ((flags_int & bit_pattern) !== 0) {
                  return 1;
                } else {
                  return 0;
                }
              }
            });
          })(property, bit_pattern);
        }
        //.........................................................................................................
        this.dba.create_table_function({
          name: prefix + 'reltrigs',
          columns: ['schema', 'type', 'name', 'tbl_name', 'rootpage'],
          parameters: [],
          varargs: false,
          deterministic: false,
          rows: (function*() {
            return (yield* this.dba.query(this.sql.reltrigs));
          }).bind(this)
        });
        //.........................................................................................................
        return null;
      }

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      * walk_schemas() {
        var ref, results, row;
        ref = this.dba.query(SQL`select name as schema from dcat_databases;`);
        results = [];
        for (row of ref) {
          results.push((yield row.schema));
        }
        return results;
      }

      // _walk_schemas_i: -> yield @dba.sql.I row.name for row from @dba.query SQL"select name from dcat_databases;"
      * _walk_sqlite_schema_selects() {
        var ref, schema;
        ref = this.walk_schemas();
        for (schema of ref) {
          yield SQL`select
    ${this.dba.sql.L(schema)} as schema,
    type,
    name,
    tbl_name,
    rootpage
  from ${this.dba.sql.I(schema)}.sqlite_schema`;
        }
        return null;
      }

      _get_union_of_sqlite_schema_selects() {
        var s;
        return ((function() {
          var ref, results;
          ref = this._walk_sqlite_schema_selects();
          results = [];
          for (s of ref) {
            results.push(s);
          }
          return results;
        }).call(this)).join("\nunion all\n");
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Dcat.C = guy.lft.freeze({
      function_flags: {
        is_deterministic: 0x000000800, // SQLITE_DETERMINISTIC
        is_directonly: 0x000080000, // SQLITE_DIRECTONLY
        is_subtype: 0x000100000, // SQLITE_SUBTYPE
        is_innocuous: 0x000200000 // SQLITE_INNOCUOUS
      },
      defaults: {
        constructor_cfg: {
          dba: null,
          prefix: 'dcat_'
        }
      }
    });

    return Dcat;

  }).call(this);

  //===========================================================================================================
  C = this.Dcat.C;

}).call(this);

//# sourceMappingURL=main.js.map