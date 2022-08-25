//O Script acionado ao enviar o form, irá validar os dados informados e enviar email para o aluno e/ou orientador(a) em casos de sucesso e/ou erro.
var planilhaDeOrientacaoID = '';
var planilhaDeIntecaoID = '';
var linkformconfirmacao = ''
var emailcoord = ''

var flagErro = false;
var token = "";
//inicialização do form e sheets
var form = FormApp.getActiveForm();
var orientSheets = SpreadsheetApp.openById(planilhaDeOrientacaoID);
var intencaoSheet = SpreadsheetApp.openById(planilhaDeIntecaoID).getSheetByName('Intenção');


function enviarEmail(e) {
    //obtém template do email a partir do arquivo html
    var html = HtmlService.createTemplateFromFile("email.html");
    var htmlText = html.evaluate().getContent();

    var assunto = "[PGCCMatrícula] Confirmação de matrícula";
    var textBody = "Esse email requer suporte à HTML";

    //obtém os dados informados no formulário
    var resposta = e.response.getItemResponses();
    console.log(resposta[0].getResponse());
    
    var emailAluno = e.response.getRespondentEmail();
    console.log("email aluno: " + emailAluno);

    var nome = resposta[0].getResponse();
    var matricula = resposta[1].getResponse();
    var orientador = resposta[2].getResponse();

    var timeStamp = e.response.getTimestamp();
    console.log("timeStamp: " + timeStamp);

    token = md5(matricula+timeStamp);

    //formata lista de disciplinas
    var disciplinas = "<ul>";
    result = [];
    var reg = /<(.*?)>/g;

    while ((array = reg.exec(resposta[3].getResponse())) !== null) {
        result.push(array[0]);
    }
    for (var i = 0; i < result.length; i++) {
        result[i] = result[i].replace(/</g, "");
        result[i] = result[i].replace(/>/g, "");
        result[i] = "<li>" + result[i] + "</li>"
        disciplinas = disciplinas + result[i];
    }
    disciplinas = disciplinas + "</ul>";
    //pega o número da linha e verifica se os dados que o aluno digitou batem com os dados que estão na planilha de orientação
    var row = getRowMat(matricula);
    if (row != null) {
        if (orientador == orientSheets.getSheetByName('dados').getRange(row, 4).getValue() 
        && matricula == orientSheets.getSheetByName('dados').getRange(row, 1).getValue() 
        && emailAluno.toLowerCase() == orientSheets.getSheetByName('dados').getRange(row, 3).getValue().toLowerCase()) {
            //caso os dados estejam corretos, formata o email
            htmlText = htmlText.replace(/%NomeDoAluno%/, nome);
            htmlText = htmlText.replace(/%Disciplinas%/, disciplinas);
            htmlText = htmlText.replace(/%Token%/, token);
            htmlText = htmlText.replace(/%LinkFormulário%/, linkformconfirmacao );
            console.log(htmlText);
            var options = {
                htmlBody: htmlText
            };
            var emailTo = orientSheets.getSheetByName('dados').getRange(row, 5).getValue();
            //envia o email
            GmailApp.sendEmail(emailTo, assunto, textBody, options);
            //em casos de edição, tira a confirmação do orientador na intenção de matrícula
            limparConfirmacaoDoOrientador(matricula);
            //escreve token na planilha de orientação
            orientSheets.getSheetByName('dados').getRange(row, 6).setValue(token);
        }
        //erro se os dados informados no formulário não possuem os mesmos relacionamentos que a planilha
        else {
            if (orientador != orientSheets.getSheetByName('dados').getRange(row, 4).getValue() ) {
              console.log("orientador diferente: " + orientador + " <> " + orientSheets.getSheetByName('dados').getRange(row, 4).getValue())
            }
            
            if (matricula != orientSheets.getSheetByName('dados').getRange(row, 1).getValue() ){
              console.log("matrícula diferente: " + matricula + " <> " + orientSheets.getSheetByName('dados').getRange(row, 1).getValue())
            }
            if (emailAluno.toLowerCase() != orientSheets.getSheetByName('dados').getRange(row, 3).getValue().toLowerCase()){
              console.log("emailAluno diferente: " + emailAluno + " <> " + orientSheets.getSheetByName('dados').getRange(row, 3).getValue())
            }
            erro(emailAluno);
            flagErro = true;
        }


    }
    //erro se a linha for nula (matricula não encontrada)
    else {
        console.log("matrícula não encontrada: " + matricula);
        erro(emailAluno);
        flagErro = true;
    }
    //escreve respostas na planilha
    formatSheet(nome, emailAluno, matricula, orientador, resposta[3].getResponse(), timeStamp);
}

function erro(emailAluno) {
    //caso os dados estejam errados, envia um email informando.
    GmailApp.sendEmail(emailAluno+','+emailcoord, "[PGCCMatrícula] Tentativa de Matrícula", "(Este email foi gerado automaticamente pelo sistema de matrícula do PGCC)\n\nOcorreu um erro ao registrar sua intenção de matrícula no PGCC.\n\nNúmero de matrícula e/ou email não encontrado no cadastro ou não possui vínculo com o orientador informado.\n\nVerifique se digitou corretamente e tente novamente.");

}
//descobre próxima linha vazia. encontrado aqui: https://stackoverflow.com/questions/6882104/faster-way-to-find-the-first-empty-row-in-a-google-sheet-column
function getFirstEmptyRow(sheet) {
    var spr = sheet;
    var column = spr.getRange('A:A');
    var values = column.getValues(); // get all data in one call
    var ct = 0;
    while (values[ct][0] != "") {
        ct++;
    }
    return (ct + 1);
}
//Função para limpar a confirmação do orientador, caso o aluno edite a intenção de matrícula.
function limparConfirmacaoDoOrientador(matricula) {
    var tfMat = intencaoSheet
        .getRange('A2:A')
        .createTextFinder(matricula);
    tfMat.matchEntireCell(true);
    var next = tfMat.findNext();
    if (next != null) {
        var matRow = next.getRow();
        var range = "F" + matRow;
        intencaoSheet.getRange(range).setValue('');
    }


}

function getRowMat(matricula) {
    var tfMat = orientSheets
        .getRange('A2:A')
        .createTextFinder(matricula);
    tfMat.matchEntireCell(true);
    var next = tfMat.findNext();
    if (next != null) {
        var row = next.getRow();
        return row;
    }


}


//A função serve para copiar as respostas escolhidas pelo aluno e escrita, formatá-las de forma a deixá-las mais legível, e escrevê-las na aba "Intenção" da planilha de intenção.

function formatSheet(nome, email, matricula, orientador, disciplinas, timeStamp) {

    var destSheet = intencaoSheet;
    var row = getFirstEmptyRow(destSheet);
    //Entra em loop lendo as células da coluna


    discFormatada = "";
    //Regex para capturar cada disciplina
    // a barra '/' indica o inicio do regex
    // o menor que '<' e maior que '>' correspondem aos próprios caracteres '<' e '>'
    // os parênteses '(' e ')' indica um grupo de captura
    // o ponto '.' corresponde a qualquer caractere, exceto quebra de linha
    // o asterisco '*' corresponde à 0 ou mais do token anterior (no caso o '.')
    // o ponto de interrogação '?' é uma flag que indica o regex para encontrar a menor quantidade de caracteres possível (usado para capturar apenas a primeira disciplina, caso haja mais de uma)
    // a barra seguida da letra g '/g' é uma flag que indica o regex para encontrar mais de 1 resultado (para achar as disciplinas seguintes)
    var reg = /<(.*?)>/g;

    //entra em loop para achar todas as disciplinas
    while ((array = reg.exec(disciplinas)) !== null) {
        console.log('substring capturada pelo regex:' + array[0]);
        discFormatada = discFormatada + array[0];
    }
    //para cada disciplina, poda os caracteres '<' e '>', e guarda no resultado separando com a quebra de linha
    discFormatada = discFormatada.replace(/</g, "");
    discFormatada = discFormatada.replace(/>/g, "\n");
    console.log('resultado podado:' + discFormatada);
    //A célula a ser escrita é dada por  i + 2 para saltar o cabeçalho
    var range = "D" + row;
    console.log('celula à escrever:' + range);
    //escreve o resultado na célula
    destSheet.getRange(range).setValue(discFormatada);
    //escreve matricula
    var range = "A" + row;
    destSheet.getRange(range).setValue(matricula);
    //escreve nome
    var range = "B" + row;
    destSheet.getRange(range).setValue(nome);
    //escreve email
    var range = "C" + row;
    destSheet.getRange(range).setValue(email);
    //escreve orientador
    var range = "E" + row;
    destSheet.getRange(range).setValue(orientador);
    //escreve flag de erro
    var range = "H" + row;
    if (flagErro) {
        destSheet.getRange(range).setValue("Erro");
    } else {
        destSheet.getRange(range).setValue("Ok");
    }
    //escreve timeStamp
    var range = "G" + row;
    destSheet.getRange(range).setValue(timeStamp);
    //escreve Token
    var range = "I" + row;
    destSheet.getRange(range).setValue(token);

    console.log('Conteúdo da célula após escrita:' + destSheet.getRange(range).getValue());

}
//função que gera hash md5 para servir como token à ser enviado ao orientador
// encontrado em: https://stackoverflow.com/questions/7994410/hash-of-a-cell-text-in-google-spreadsheet
function md5 (input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input);
  var txtHash = '';
  for (i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}
