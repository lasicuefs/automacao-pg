//O script serve para identificar o token informado no formulário, e a partir dele:
// - encontra o aluno que o token representa
// - checa na planilha de orientação se o aluno e o orientandor estão relacionados
// - escreve a confirmação do orientador na planilha de intenção de matrícula
//O script enviará email para o aluno e orientador nos casos de sucesso e erro.

//IDs das planilhas
var planilhaOrientacaoID = ''
var planilhaIntencaoDeMatriculaID = ''

//inicializa planilhas
var orientSheets = SpreadsheetApp.openById(planilhaOrientacaoID);
var intencaoSheet = SpreadsheetApp.openById(planilhaIntencaoDeMatriculaID).getSheetByName('Intenção');

function confirmar(e) {

    //obtém o token informado no formulário

    var resposta = e.response.getItemResponses();
    var emailOrientadorForm = e.response.getRespondentEmail();
    var token = resposta[0].getResponse();
    console.log('token:' + token);
    //na planilha de orientação, descobre o número da linha aluno/orientador baseado no token do aluno
    var tf = orientSheets
        .getSheetByName('dados')
        .getRange('F2:F')
        .createTextFinder(token);
    tf.matchEntireCell(true);
    var next = tf.findNext();
    var row = '';
    //se o token existe, retorna a linha que ele representa
    if (next != null) {
        row = next.getRow();
    }
    //se não existir o token, envia email de erro para o orientador
    else {
        GmailApp.sendEmail(emailOrientadorForm, '[PGCCMatrícula] Erro ao confirmar intenção de matrícula PGCC', '(Este email foi gerado automaticamente pelo sistema de matrícula do PGCC)\n\nERRO: O token informado não foi encontrado, verifique se digitou corretamente ou se há token mais recente, e tente novamente.');
        return;
    }
    //Coleta as informações necessárias da planilha de orientação

    
    //descobre o nome do aluno a partir da linha obtida
    var nomeAluno = orientSheets.getSheetByName('dados').getRange(row, 2).getValue();
    console.log('nome aluno:' + nomeAluno);
    //descobre o email do aluno a partir da linha obtida
    var emailAluno = orientSheets.getSheetByName('dados').getRange(row, 3).getValue();
    console.log('email aluno:' + emailAluno);
    //descobre o nome do orientador a partir da linha obtida
    var nomeOrientador = orientSheets.getSheetByName('dados').getRange(row, 4).getValue();
    console.log('nome orientador' + nomeOrientador);
    //descobre o email do orientador a partir da linha obtida
    var emailOrientador = orientSheets.getSheetByName('dados').getRange(row, 5).getValue();
    console.log('email orientador:' + emailOrientador);

    
    //na planilha de intenção de matricula, descobre o número da linha aluno/orientador baseado no token do aluno 
    var tokenRow = "";
    var tfMat = intencaoSheet
        .getRange('I2:I')
        .createTextFinder(token);
    tfMat.matchEntireCell(true);
    var matNext = tfMat.findNext();
    if (matNext != null) {
        tokenRow = matNext.getRow();
    } else {
        console.log("ERRO: token não encontrado na planilha de intenção");
    }

    //escreve confirmado na planilha de inteção de matricula
    console.log("linha do token: " + tokenRow);
    if (tokenRow != "" && tokenRow != null) {
        var range = "F" + tokenRow;
        intencaoSheet.getRange(range).setValue('confirmado');

        //coleta disciplinas na intenção de matrícula
        range = "D" + tokenRow;
        var disciplinas = intencaoSheet.getRange(range).getValue();

        //envia email de confirmação
        var assunto = '[PGCCMatrícula] Intenção de matrícula confirmada pelo Orientador';
        var mensagem = '(Este email foi gerado automaticamente pelo sistema de matrícula do PGCC)\n\nA intenção de matrícula do(a) discente <nomeAluno> foi confirmada pelo(a) orientador(a) <nomeOrientador>. \n Aguarde a efetuação da matrícula conforme calendário do PGCC. \n\n'+
        'Disciplinas confirmadas: \n'+disciplinas;

        mensagem = mensagem.replace('<nomeAluno>', nomeAluno);
        mensagem = mensagem.replace('<nomeOrientador>', nomeOrientador);
        GmailApp.sendEmail(emailAluno, assunto, mensagem);
        GmailApp.sendEmail(emailOrientador, assunto, mensagem);
    } else {
        //envia email de erro

        var assunto = '[PGCCMatrícula] Erro no registro de confirmação';
        var mensagem = '(Este email foi gerado automaticamente pelo sistema de matrícula do PGCC)\n\nERRO: Não foi encontrada a intenção de matrícula do(a) discente <nomeAluno>, orientador(a) <nomeOrientador>. Faça contato com a coordenação do PGCC.';
        mensagem = mensagem.replace('<nomeAluno>', nomeAluno);
        mensagem = mensagem.replace('<nomeOrientador>', nomeOrientador);
        GmailApp.sendEmail(emailAluno, assunto, mensagem);
        GmailApp.sendEmail(emailOrientador, assunto, mensagem);
    }

}
