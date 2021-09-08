
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA-CATALOG'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
types                     = new ( require 'intertype' ).Intertype
{ isa
  type_of
  validate
  validate_list_of }      = types.export()
# { to_width }              = require 'to-width'
SQL                       = String.raw
E                         = require './errors'
{ Dba, }                  = require 'icql-dba'
guy                       = require 'guy'



#===========================================================================================================
types.declare 'dba', tests:
  "@isa.object x":                    ( x ) -> @isa.object x
types.declare 'constructor_cfg', tests:
  "@isa.object x":                    ( x ) -> @isa.object x
  "@isa.dba x.dba":                   ( x ) -> @isa.dba x.dba
  "@isa.nonempty_text x.prefix":      ( x ) -> @isa.nonempty_text x.prefix

#===========================================================================================================
class @Dcat

  #---------------------------------------------------------------------------------------------------------
  @C:
  @C: guy.lft.freeze
    defaults:
      constructor_cfg:
        dba:        null
        prefix:     'dcat_'

  #---------------------------------------------------------------------------------------------------------
  @declare_types: ( self ) ->
    self.types.validate.constructor_cfg self.cfg
    guy.props.def self, 'dba', { enumerable: false, value: self.cfg.dba, }
    self.cfg = guy.lft.lets self.cfg, ( d ) -> delete d.dba
    return null

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    #.......................................................................................................
    guy.cfg.configure_with_types @, cfg, types
    @_compile_sql()
    @_create_sql_functions()
    @_create_db_structure()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _create_db_structure: ->
    prefix = @cfg.prefix
    @dba.execute SQL"""
      create view #{prefix}compile_time_options as with r1 as ( select
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
        order by 1;"""
    return null

  #---------------------------------------------------------------------------------------------------------
  _compile_sql: ->
    prefix = @cfg.prefix
    # @query "select * from sqlite_schema order by type desc, name;"
    # sql =
    #   f: SQL""
    # guy.props.def @, 'sql', { enumerable: false, value: sql, }
    return null

  #---------------------------------------------------------------------------------------------------------
  _create_sql_functions: ->
    @dba.create_stdlib()
    prefix = @cfg.prefix
    #.........................................................................................................
    @dba.create_function
      name:           prefix + 'fun_flags_as_text'
      deterministic:  true
      varargs:        false
      call:           ( flags_int ) ->
        R = []
        for k, v of C.function_flags
          R.push "+#{k}" if ( flags_int & v ) != 0
        # R.push '+usaf' unless '+inoc' in R
        return R.join ''
    #.........................................................................................................
    for property, bit_pattern of C.function_flags then do ( property, bit_pattern ) =>
      @dba.create_function
        name:           prefix + 'fun_' + property
        deterministic:  true
        varargs:        false
        call:           ( flags_int ) -> if ( flags_int & bit_pattern ) != 0 then 1 else 0
    return null


  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  # alter_table: ( cfg ) ->
  #   validate.dhlr_alter_table_cfg cfg = { types.defaults.dhlr_alter_table_cfg..., cfg..., }
  #   { schema
  #     table_name
  #     json_column_name
  #     blob_column_name }  = cfg
  #   prefix                = @cfg.prefix
  #   return null

############################################################################################################
if module is require.main then do =>
  # debug '^2378^', require 'datom'








