/**
 * Script que gera uma tabela de transclusões para os linsk de uma página
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	var pageList = [];

	function getWikitableForData( data, title, format ) {
		var text = '{| class="wikitable sortable"\n',
			i, j, line;
		if ( title ) {
			text += '|+ ' + title + '\n';
		}
		if ( !format ) {
			format = [];
			for ( j = 0; j < data.length; j++ ) {
				format[j] = '$' + (j + 1);
			}
		}
		format = '|-\n|' + format.join( '||' ) + '\n';
		text += '|-\n!' + data[0].join( '||' ) + '\n';
		for ( i = 1; i < data.length; i++ ) {
			line = format;
			for ( j = 0; j < data.length; j++ ) {
				line = line.replace( new RegExp( '\\$' + (j + 1), 'g'), data[i][j] );
			}
			text += line;
		}
		text += '|}';
		return text;
	}
	function generateBackLinksTable() {
		var total = pageList.length,
			done = 0,
			mean = 0,
			table = [ [ 'Páginas', 'Afluentes' ] ];
		$.each( pageList, function ( pos ) {
			var page = pageList[ pos ];
			$.getJSON(
				mw.util.wikiScript( 'api' ), {
					format: 'json',
					action: 'query',
					list: 'embeddedin',
					eititle: page,
					einamespace: mw.config.get( 'wgContentNamespaces' ).join( '|' ),
					eilimit: '500',
					indexpageids: true
				}, function ( data ) {
					var text;
					table.push( [ page, data.query.embeddedin.length ] );
					done++;
					mean = mean + ( data.query.embeddedin.length - mean) / done;
					mw.notify( 'Processando a página ' + done + ' de um total de ' + total + '.', {
						tag: 'page-analysis'
					} );
					if ( done === total ) {
						text = 'As páginas listadas têm em média ' + Math.round(mean) + ' afluentes.\n\n';
						text += getWikitableForData(
							table,
							'Número de transclusões das páginas',
							[ '[[:$1]]', '[[Special:Páginas afluentes/$1|$2]]' ]
						);
						$('#mw-content-text').prepend(
							'<b>Código wiki:</b><br/><br/>' +
							'<textarea cols="80" rows="40" style="width: 100%; font-family: monospace; line-height: 1.5em;">' +
							mw.html.escape(text) +
							'</textarea>'
						);
					}
				}
			);
		});
	}

	function processPageLinks( page, from ) {
		var data = {
			format: 'json',
			action: 'query',
			prop: 'links',
			pllimit: 'max',
			titles: page,
			indexpageids: true,
			rawcontinue: 1
		};
		if ( from ) {
			data.plcontinue = from;
		}
		$.ajax({
			url: mw.util.wikiScript( 'api' ),
			dataType: 'json',
			data: data
		})
		.done( function ( data ) {
			var cont;
			if ( !data ) {
				alert( 'Erro: a API não retornou dados.' );
			} else if ( data.error !== undefined ) {
				alert( 'Erro da API: ' + data.error.code + '. ' + data.error.info );
			} else if ( data.query && data.query.pageids && data.query.pages) {
				pageList = $.map( data.query.pages[ data.query.pageids[0] ].links, function ( link ) {
					return link.title;
				} );
				cont = data[ 'query-continue' ] &&
					data[ 'query-continue' ].links &&
					data[ 'query-continue' ].links.plcontinue;
				if ( cont ) {
					processPageLinks( page, cont );
				} else {
					mw.notify( 'Concluída a consulta à lista de links da página "' + page + '".', {
						tag: 'page-links-analysis'
					} );
					generateBackLinksTable();
				}
			} else {
				alert( 'Houve um erro inesperado ao consultar a lista de links da página.' );
			}
		})
		.fail( function () {
			alert( 'Houve um erro ao usar AJAX para consultar a lista de links da página.' );
		});
	}

	function addWhatTranscludesEachLink() {
		$(mw.util.addPortletLink(
			'p-cactions',
			'#',
			'Gerar tabela de transclusões (lista)',
			'ca-ah-backlinks-from-list',
			'Produz uma tabela com o número de transclusões por página para a qual há um link nesta página'
		)).click( function ( e ) {
			e.preventDefault();
			processPageLinks( mw.config.get( 'wgPageName' ) );
		});
	}
	if ( $.inArray(mw.config.get( 'wgAction' ), ['view', 'purge' ]) !== -1) {
		$( addWhatTranscludesEachLink );
	}

}( mediaWiki, jQuery ) );
