/*
The MIT License (MIT)

Copyright (c) 2017 Guilherme Sávio
Github: https://github.com/gsavio

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Ao utilizar, mudar para false para evitar erros ao tentar buscar os dados de seu streaming
const DEMO = true;

// Nome da Rádio
const NOME_RADIO = "THE BEAT RADIO";

// Endereço do streaming Shoutcast com porta (se houver) e sem / no final. Exemplo: http://streaming.com:8080
const URL_STREAMING = "http://51.254.164.158:8209/;";

// Visite https://api.vagalume.com.br/docs/ para saber como conseguir uma chave para API de letras
var API_KEY = "59e58b6210e7ed9e488a8499097976fe";

window.onload = function() {
	var pagina = new Pagina;
    pagina.alterarTitle();
    pagina.setVolume();

    var player = new Player();
    player.play();

    setInterval(function() {
        pegarDadosStreaming();
    }, 4000);

    var capaAlbum = document.getElementsByClassName('capa-album')[0];
    capaAlbum.style.height = capaAlbum.offsetWidth + 'px';
}

// Controle do DOM
function Pagina() {
    // Alterar o título da página para o nome da rádio
	this.alterarTitle = function(titulo = NOME_RADIO) {
		document.title = titulo;
	};

    // Atualizar faixa atual
    this.atualizarFaixaAtual = function(musica, artista) {
        var faixaAtual = document.getElementById('faixaAtual');
        var artistaAtual = document.getElementById('artistaAtual');

        if(musica !== faixaAtual.innerHTML) {
            // Caso a faixa seja diferente da atual, atualizar e inserir a classe com animação em css
            faixaAtual.className = 'animated flipInY text-uppercase';
            faixaAtual.innerHTML = musica;

            artistaAtual.className = 'animated flipInY text-capitalize';
            artistaAtual.innerHTML = artista;
            
            // Atualizar o título do modal com a letra da música
            document.getElementById('letraMusica').innerHTML = musica + ' - ' + artista; 
            // Removendo as classes de animação
            setTimeout(function() {
                faixaAtual.className = 'text-uppercase';
                artistaAtual.className = 'text-capitalize';
            }, 2000);
        }
    }

    // Atualizar a imagem de capa do Player e do Background
    this.atualizarCapa = function(musica, artista) {
        // Imagem padrão caso não encontre nenhuma na API do iTunes
        var urlCapa = 'img/bg-capa.jpg';

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            // Seletores de onde alterar a imagem de capa do album
            var capaMusica = document.getElementById('capaAtual');
            var capaBackground = document.getElementById('capaBg');

            // Buscar imagem da capa na API do iTunes
            if(this.readyState === 4 && this.status === 200) {
                var dados = JSON.parse(this.responseText);
                var artworkUrl100 = (dados.resultCount) ? dados.results[0].artworkUrl100 : urlCapa;
                // Se retornar algum dado, alterar a resolução da imagem ou definir a padrão
                urlCapa = (artworkUrl100 != urlCapa) ? artworkUrl100.replace('100x100bb', '512x512bb') : urlCapa;

                capaMusica.style.backgroundImage = 'url(' + urlCapa + ')';
                capaBackground.style.backgroundImage = 'url(' + urlCapa + ')';

                if('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: musica,
                        artist: artista,
                        artwork: [
                            {src: urlCapa, sizes: '512x512', type: 'image/png'},
                        ]
                    });
                }
            }
        }
        xhttp.open('GET', 'https://itunes.apple.com/search?term=' + musica + ' ' + artista +'&limit=1', true);
        xhttp.send();
    }

    // Altera o percentual do indicador de volume
    this.alterarPorcentagemVolume = function(volume) {
        document.getElementById('indicadorVol').innerHTML = volume;

        if(typeof(Storage) !== 'undefined') {
            localStorage.setItem('volume', volume);
        }
    }

    // Configura o volume se já tiver sido alterado antes
    this.setVolume = function() {
        if(typeof(Storage) !== 'undefined') {
            var volumeLocalStorage = (localStorage.getItem('volume') === null) ? 80 : localStorage.getItem('volume');
            document.getElementById('volume').value = volumeLocalStorage;
            document.getElementById('indicadorVol').innerHTML = volumeLocalStorage;
        }
    }
    // Atualiza a exibição da letra da música
	this.atualizarLetra = function(musica, artista) {
        var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if(this.readyState === 4 && this.status === 200) {
                var retorno = JSON.parse(this.responseText);

                var botaoVerLetra = document.getElementsByClassName('ver-letra')[0];

                if(retorno.type === 'exact' || retorno.type === 'aprox') {
                    var letra = retorno.mus[0].text;

				    document.getElementById('letra').innerHTML = letra.replace(/\n/g, '<br />');
                    botaoVerLetra.style.opacity = "1";
                    botaoVerLetra.setAttribute('data-toggle', 'modal');
                } else {
                    botaoVerLetra.style.opacity = "0.3";
                    botaoVerLetra.removeAttribute('data-toggle');
                    
                    var modalLetra = document.getElementById('modalLetra');
                    modalLetra.style.display = "none";
                    modalLetra.setAttribute('aria-hidden', 'true');
                    document.getElementsByClassName('modal-backdrop')[0].remove();
                }
			}
		}
		xhttp.open('GET', 'https://api.vagalume.com.br/search.php?apikey=' + API_KEY +'&art=' + artista + '&mus=' + musica, true);
		xhttp.send()
	}
}

var audio = new Audio(URL_STREAMING + '/;');

// Controle do áudio e player
function Player() {
	this.play = function() {
        audio.play();
        
        var volumePadrao = document.getElementById('volume').value;

        if(typeof(Storage) !== 'undefined') {
            if(localStorage.getItem('volume') !== null) {
                audio.volume = intToDecimal(localStorage.getItem('volume'));
            } else {
                audio.volume = intToDecimal(volumePadrao);
            }
        } else {
            audio.volume = intToDecimal(volumePadrao);
        }
        document.getElementById('indicadorVol').innerHTML = volumePadrao;

        audio.onabort = function() {
            audio.load();
            audio.play();
        }
	};

	this.pause = function() {
		audio.pause();
	};
}

// Ao audio ser parado, muda o botão de play para pause
audio.onplay = function() {
    var botao = document.getElementById('botaoPlayer');

    if(botao.className === 'fa fa-play') {
        botao.className = 'fa fa-pause';
    }
}

// Ao audio ser parado, muda o botão de pause para play
audio.onpause = function() {
    var botao = document.getElementById('botaoPlayer');

    if(botao.className === 'fa fa-pause') {
        botao.className = 'fa fa-play';
    }
}

// Remove o mudo caso o volume seja alterado
audio.onvolumechange = function() {
    if(audio.volume > 0) {
        audio.muted = false;
    }    
}

// Caso perca a conexão com o servidor do streaming, exibe este alerta
audio.onerror = function() {
    var confirmacao = confirm('Houve um problema ao tentar se conectar ao servidor. \nClique em OK para tentar novamente.');

    if(confirmacao) {
        window.location.reload();
    }
}

// Ao deslizar a barra de volume, muda o volume do áudio e do indicador
document.getElementById('volume').oninput = function() {
    audio.volume = intToDecimal(this.value);

    var pagina = new Pagina();
    pagina.alterarPorcentagemVolume(this.value);
}

// Função de play e pause do player
function togglePlay() {
    if(!audio.paused) {
        audio.pause();
    } else {
        audio.load();
        audio.play();
    }
}

// Função para mutar e desmutar o player 
function mutar() {
    if(!audio.muted) {
        // Seleciona direto o elemento para não alterar o volume salvo no localstorage
        document.getElementById('indicadorVol').innerHTML = 0;
        document.getElementById('volume').value = 0;
        audio.volume = 0;
        audio.muted = true;
    } else {
        var localVolume = localStorage.getItem('volume');
        document.getElementById('indicadorVol').innerHTML = localVolume;
        document.getElementById('volume').value = localVolume;
        console.log(localVolume);
        audio.volume = intToDecimal(localVolume);
        audio.muted = false;
    }
}

// Busca os dados de transmissão do streaming
function pegarDadosStreaming() {
    var xhttp = new XMLHttpRequest();
    var urlRequest = (!DEMO) ? 'dados.php' : 'https://jusnsdt.cu.ma/dados.php';
	xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            var dados = JSON.parse(this.responseText);

            var pagina = new Pagina();

            // Substituindo caracteres de url para UTF-8
            var musicaAtual = dados.faixa.replace('&apos;', '\'');
            musicaAtual = musicaAtual.replace('&amp;', '&');

            var artistaAtual = dados.artista.replace('&apos;', '\'');
            artistaAtual = artistaAtual.replace('&amp;', '&');

            // Alterando o título da página com a música e artista atual
            document.title = musicaAtual + ' - ' + artistaAtual + ' | ' + NOME_RADIO; 

            if(document.getElementById('faixaAtual').innerHTML !== musicaAtual) {
                pagina.atualizarCapa(musicaAtual, artistaAtual);
                pagina.atualizarFaixaAtual(musicaAtual, artistaAtual);
    			pagina.atualizarLetra(musicaAtual, artistaAtual);
            }
        }
    };
    xhttp.open('GET', urlRequest + '?url=' + URL_STREAMING, true);
    xhttp.send();
}

// Controle do player por teclas 
document.addEventListener('keydown', function(k) {
    var k = k || window.event;
    var tecla = k.keyCode || k.which;
    var slideVolume = document.getElementById('volume');
    
    var pagina = new Pagina();

    switch(tecla) {
        case 32:
            togglePlay();
            break;
        case 80:
            togglePlay();
            break;
        case 77:
            mutar();
            break;
        case 48:
            audio.volume = 0;
            slideVolume.value = 0;
            pagina.alterarPorcentagemVolume(0);
            break;
        case 96:
            audio.volume = 0;
            slideVolume.value = 0;
            pagina.alterarPorcentagemVolume(0);
            break;
        case 49:
            audio.volume = 0.1;
            slideVolume.value = 10;
            pagina.alterarPorcentagemVolume(10);
            break;
        case 97:
            audio.volume = 0.1;
            slideVolume.value = 10;
            pagina.alterarPorcentagemVolume(10);
            break;
        case 50:
            audio.volume = 0.2;
            slideVolume.value = 20;
            pagina.alterarPorcentagemVolume(20);
            break;
        case 98:
            audio.volume = 0.2;
            slideVolume.value = 20;
            pagina.alterarPorcentagemVolume(20);
            break;
        case 51:
            audio.volume = 0.3;
            slideVolume.value = 30;
            pagina.alterarPorcentagemVolume(30);
            break;
        case 99:
            audio.volume = 0.3;
            slideVolume.value = 30;
            pagina.alterarPorcentagemVolume(30);
            break;
        case 52:
            audio.volume = 0.4;
            slideVolume.value = 40;
            pagina.alterarPorcentagemVolume(40);
            break;
        case 100:
            audio.volume = 0.4;
            slideVolume.value = 40;
            pagina.alterarPorcentagemVolume(40);
            break;
        case 53:
            audio.volume = 0.5;
            slideVolume.value = 50;
            pagina.alterarPorcentagemVolume(50);
            break;
        case 101:
            audio.volume = 0.5;
            slideVolume.value = 50;
            pagina.alterarPorcentagemVolume(50);
            break;
        case 54:
            audio.volume = 0.6;
            slideVolume.value = 60;
            pagina.alterarPorcentagemVolume(60);
            break;
        case 102:
            audio.volume = 0.6;
            slideVolume.value = 60;
            pagina.alterarPorcentagemVolume(60);
            break;
        case 55:
            audio.volume = 0.7;
            slideVolume.value = 70;
            pagina.alterarPorcentagemVolume(70);
            break;
        case 103:
            audio.volume = 0.7;
            slideVolume.value = 70;
            pagina.alterarPorcentagemVolume(70);
            break;
        case 56:
            audio.volume = 0.8;
            slideVolume.value = 80;
            pagina.alterarPorcentagemVolume(80);
            break;
        case 104:
            audio.volume = 0.8;
            slideVolume.value = 80;
            pagina.alterarPorcentagemVolume(80);
            break;
        case 57:
            audio.volume = 0.9;
            slideVolume.value = 90;
            pagina.alterarPorcentagemVolume(90);
            break;
        case 105:
            audio.volume = 0.9;
            slideVolume.value = 90;
            pagina.alterarPorcentagemVolume(90);
            break;
    }
});

// Converter valor inteiro em decimal
function intToDecimal(vol) {
    var tamanhoStr = vol.length;

    if(tamanhoStr > 0 && tamanhoStr < 3) {
        if(tamanhoStr === 1) {
            volume = '0.0' + vol ;
        } else {
            volume = '0.' + vol;
        }
    } else if(vol === '100') {
        volume = 1;
    }

    return volume;
}
