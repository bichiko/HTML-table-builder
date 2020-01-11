const tableBuilder = ( function ( Table, window ) {
  if ( window && 'document' in window ) {
    return $attrs => new Table( window.document, $attrs );
  }
} )( function ( document, $attrs = null ) {
  let debug = false;
  let doneCallbacks = [];
  let createMode = false;
  let newColumn = null;
  let newCell = null;
  let objectKeysBackup = [];
  let headerNames = {};
  let appendDone = false;
  let cloned = {};
  let orderKeys = [];

  if ( typeof $attrs === "string" ) {
    this.table = document.querySelector( $attrs );
  } else if ( $attrs !== null ) {
    createMode = true;
    this.table = document.createElement( 'table' );
    this.headers = [];
    for ( let key in $attrs ) {
      if ( $attrs.hasOwnProperty( key ) ) {
        this.table.setAttribute( key, $attrs[ key ] );
      }
    }
  }

  // set debug mode to output warnings and logs
  this.debugMode = mode => debug = mode;

  /*helper functions*/
  let is = {
    pattern: {
      anArray: function ( anArray, size = 0 ) {
        let isArray = true;
        if ( undefined !== anArray && size !== 0 ) {
          if ( anArray instanceof Array && anArray.length === size ) {
            for ( let i = 0; i < anArray.length - 1; i++ ) {
              if ( !Array.isArray( anArray[ i ] ) && !( typeof anArray[ i ] === 'object' ) ) {
                isArray = false;
                break;
              }
            }
          }
        }

        return isArray;
      }
    }
  };

  /* Sets headers as an array */
  this.setHeader = ( $names = null, $hidden = false ) => {
    //$hidden is to hide header and just append body
    //header is important for order and validation
    if ( !createMode ) return;
    let hasAttrs = false;
    if ( null !== $names ) {
      switch ( true ) {
        case typeof $names === "string":
          // ex. "name, last_name,table"
          this.headers = $names.split( ',' );
          break;
        case $names instanceof Array:
          // ex. ["name", "last_name", "table"]
          this.headers = $names;
          break;
        case typeof $names === 'object':
          // ex. {name: {id:1, colspan:2}, last_name: {colspan:3}}
          this.headers = Object.keys( $names );
          headerNames = $names;
          hasAttrs = true;
          break;
      }

      let header = this.table.createTHead(), row, cell;
      if ( !$hidden ) {
        // -1 to append in the end
        row = header.insertRow( -1 );
      }

      if ( hasAttrs ) {
        Object.entries( $names )
          .forEach( ( name ) => {
            if ( !$hidden ) {
              cell = row.insertCell( -1 );
              cell.innerHTML = name[ 0 ];
              cell.setAttribute( "title", name[ 0 ] );
            }

            let attrs = name[ 1 ];
            if ( typeof attrs !== 'string' ) {
              for ( let attr in attrs ) {
                if ( attrs.hasOwnProperty( attr ) ) {
                  //extract keys here
                  //it will be used for ordering the body table
                  if ( attr === 'key' ) {
                    orderKeys.push( attrs[ attr ] );
                  }
                  if ( !$hidden ) {
                    cell.setAttribute( attr, attrs[ attr ] );
                    if ( attr === 'key' ) {
                      cell.setAttribute( 'data-key', attrs[ attr ] );
                    }
                  }
                }
              }
            }
          } );
      } else {
        this.headers
          .forEach( ( name ) => {
            if ( !$hidden ) {
              cell = row.insertCell( -1 );
              cell.innerHTML = name;
              cell.setAttribute( "title", name );
            }
          } );
      }
    }

    return this;
  };

  this.setBody = ( $objList = null, keys = [] ) => {
    if ( !createMode ) return;
    if ( $objList !== null ) {
      $objList = Object.entries( $objList );
      let body = this.table.appendChild( document.createElement( 'tbody' ) ), row, cell;
      for ( let $row = 0; $row < Object.keys( $objList ).length; $row++ ) {
        row = body.insertRow( -1 );
        //set default parameters
        row.setAttribute( 'data-key', $objList[ $row ][ 0 ] );

        let dataValue = key => $objList[ $row ][ 1 ][ key ] || `data-${ key }='not found'`;
        keys.forEach( key => row.setAttribute( `data-${ key }`, dataValue( key ) ) );

        for ( let _col = 0; _col < orderKeys.length; _col++ ) {
          let innerHTML = null, dataKey = '', currRowData = '';
          if ( Object.keys( $objList[ $row ][ 1 ] ).indexOf( orderKeys[ _col ] ) !== -1 ) {
            innerHTML = $objList[ $row ][ 1 ][ orderKeys[ _col ] ];
            currRowData = $objList[ $row ][ 1 ];
          }
          dataKey = orderKeys[ _col ];
          cell = row.insertCell( -1 );
          cell.setAttribute( 'data-key', dataKey );
          cell.setAttribute(
            'data-content',
            null === innerHTML || innerHTML.length === 0 ? '!' : innerHTML
          );
          cell.innerHTML = innerHTML;

          let tmpObj = {};
          tmpObj[ dataKey ] = cell;
          tmpObj.data = currRowData;
          //save objects by key
          objectKeysBackup.push( tmpObj );
        }
      }
    }

    return this;
  };


  this.on = ( event, fnc ) => {
    if ( orderKeys.indexOf( event ) === -1 ) {
      debug && console.warn( 'No such key "' + event + '" to trigger custom event' );

      return this;
    }

    objectKeysBackup.forEach( cell => {
      let $key = Object.keys( cell )[ 0 ];
      if ( $key === event ) {
        fnc.call( this, cell[ $key ], cell.data );
      }
    } );

    return this;
  };

  //insert column in specific index of the table
  //@where could be either body or head
  this.insertInto = ( where = 'body' ) => {
    return {
      setCell: ( $column = null, $coordinates = null, $return ) => {
        //default is false
        $return = undefined !== $return;
        if ( $column instanceof Array ) {
          if ( "string" === typeof $column[ 0 ] && !Array.isArray( $column[ 0 ] ) ) {

            if ( !is.pattern.anArray( $coordinates, 2 ) ) {
              //$coordinates = [x, y] pair
              let target = null;
              switch ( true ) {
                case where === 'body':
                  target = this.table.tBodies[ 0 ];
                  break;
                case where === 'head':
                  target = this.table.tHead;
                  break;
                default:
                  console.warn( 'Only "body" and "head" are allowed!' );
                  return this;
              }
              let rows = target.rows, cell = {};
              if ( undefined !== rows[ $coordinates[ 0 ] ] ) {
                cell = rows[ $coordinates[ 0 ] ].insertCell( $coordinates[ 1 ] );
                cell.setAttribute( 'data-key', $column[ 0 ] );
                if ( typeof $column[ 1 ] !== "string" ) {
                  cell.appendChild( $column[ 1 ] );
                } else
                  cell.innerHTML = $column[ 1 ];
                newCell = cell;
              }

              if ( $return ) {
                return cell;
              }
            } else {
              debug && console.warn( 'Expected exactly two elements of an Array! $coordinates = [x, y] pair' );
            }
          } else if ( $column.length === $coordinates.length ) {
            for ( let col = 0; col < $column.length; col++ ) {
              this.insertInto( "body" ).setCell( $column[ col ], $coordinates[ col ] );
            }
          }
        } else {
          debug && console.warn( 'Expected an Array for @setColumn parameter! ex. ["key", "value"] or [["key", "value"],["key", "value"],["key", "value"]]' );
        }

        return this;
      },
      setEmptyColumn: ( $index = 2 ) => {
        let column = [
          this.insertInto( 'head' )
            .setCell( [ '__loading__', '&nbsp;'.repeat( 20 ) ],
              [ 0, $index ],
              true
            )
        ];
        // minus 1 to exclude head tr
        Array( this.table.rows.length - 1 ).fill( 0 )
          .forEach( ( e, i ) => {
            column.push(
              this.insertInto( 'body' )
                .setCell(
                  [ '__loading__', '&nbsp;'.repeat( 20 ) ],
                  [ i, $index ],
                  true
                )
            );
          } );
        // for getter func
        newColumn = column;

        return column;
      },
      setRow: ( $index = 1, callback = null ) => {

        let target = null;
        switch ( true ) {
          case where === 'body':
            target = this.table.tBodies[ 0 ];
            break;
          case where === 'head':
            target = this.table.tHead;
            break;
          default:
            debug && console.warn( 'Only "body" and "head" are allowed!' );
            return this;
        }

        let row = target.insertRow( $index ), cells = [];
        for ( let _col = 0; _col < orderKeys.length; _col++ ) {
          let dataKey = '';

          dataKey = orderKeys[ _col ];

          let cell = row.insertCell( -1 );
          cell.setAttribute( 'data-key', dataKey );

          //save objects by key
          // cells.push({[orderKeys[_col]]:cell});
          cells.push( cell );
        }

        if ( null !== callback && "function" === typeof callback ) {
          cells.forEach( cell => callback.call( this, cell ) );
        }

        return this;
      }
    };
  };

  this.remove = ( what = 'column' ) => {
    return {
      column: ( $index = null ) => {

        if ( null !== $index ) {
          if ( typeof $index === "number" ) {
            Array( this.table.rows.length )
              .fill( 1 )
              .forEach( ( e, i ) => this.remove( 'cell' ).where( [ i, $index ] ) );
          } else {
            debug && console.warn( "Expected number type!" );
          }
        }

        return this;
      },
      where: ( $key = null ) => {
        if ( $key instanceof Array ) {
          let target = this.table;
          switch ( true ) {
            case what === 'row':
            case what === 'cell':
              break;
            default:
              debug && console.warn( 'Only "row" and "cell" are allowed!' );
              return this;
          }
          let rows = target.rows;
          let tr = rows[ $key[ 0 ] ];
          if ( $key[ 0 ] instanceof Array ) {
            $key.forEach( key => this.remove( what ).where( [ key ] ) );
          } else if ( typeof $key[ 0 ] === "number" ) {
            if ( what === 'cell' ) {
              if ( tr.cells[ $key[ 1 ] ] !== undefined ) {
                tr.deleteCell( $key[ 1 ] );
              } else {
                debug && console.warn( 'Tried to remove an index that was out of scope. A cell [y,x] => [' +
                  $key[ 0 ] + ',' + $key[ 1 ] + '] doesn\'t exist! Note: you need to pass [y,x] pairs' );
              }
            } else {
              if ( typeof tr !== "undefined" ) {
                target.deleteRow( $key[ 0 ] );
              } else {
                debug && console.warn( 'Tried to remove an index that was out of scope. A row number ' +
                  $key[ 0 ] + ' doesn\'t exist! Note you need to pass single element array [y]' );
              }
            }
          }
        }

        return this;
      }
    };
  };

  this.done = ( fns ) => {
    if ( typeof fns === "function" ) {
      if ( appendDone ) {
        fns.call( this.get.asObject );
      } else {
        doneCallbacks.push( fns );
      }
    }

    return this;
  };

  this.appendTo = ( $selector ) => {
    if ( !createMode ) return;
    // cssSelector #id.class>div
    if ( typeof $selector === "string" ) {
      document.querySelector( $selector ).appendChild( this.table );
    } else {
      $selector.appendChild( this.table );
    }
    appendDone = true;
    doneCallbacks.forEach( fn => fn.call( this.get.asObject ) );

    return this;
  };

  this.copy = ( $cellIndex = 1 ) => {
    let hRows = this.table.tHead.rows;
    let bRows = this.table.tBodies[ 0 ].rows;
    //reset vars
    cloned = { head: [], body: [] };
    for ( let hRow in hRows ) {
      if ( hRows.hasOwnProperty( hRow ) ) {
        cloned.head.push( hRows[ hRow ].cells[ $cellIndex ].cloneNode( true ) );
      }
    }
    for ( let bRow in bRows ) {
      if ( bRows.hasOwnProperty( bRow ) ) {
        cloned.body.push( bRows[ bRow ].cells[ $cellIndex ].cloneNode( true ) );
      }
    }

    return this;
  };

  this.paste = ( $cellIndex = 1 ) => {
    if ( typeof cloned.head === "undefined" ) {
      debug && console.warn( 'You should copy first! Clipboard is empty.' );
      return this;
    }
    let table = this.table;
    let hRows = table.tHead.rows;
    let bRows = table.tBodies[ 0 ].rows;

    for ( let hRow in hRows ) {
      if ( hRows.hasOwnProperty( hRow ) ) {
        hRows[ hRow ].insertBefore( cloned.head[ hRow ], hRows[ hRow ].cells[ $cellIndex ] );
      }
    }
    for ( let bRow in bRows ) {
      if ( bRows.hasOwnProperty( bRow ) ) {
        bRows[ bRow ].insertBefore( cloned.body[ bRow ], bRows[ bRow ].cells[ $cellIndex ] );
      }
    }

    return this;
  };

  let self = this;
  this.get = {
    get asObject() {

      return self.table;
    },
    get newColumn() {

      return newColumn;
    },
    get newCell() {

      return newCell;
    },
    get clipboard() {

      return cloned;
    }
  };

}, window );

module.exports = tableBuilder;
