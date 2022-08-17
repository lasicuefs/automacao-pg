//ID da pasta onde serão criadas cada pasta para cada resposta
const PARENT_FOLDER_ID = '1_l7xBMvbrnQq-';
emailComissao = "";
semestre = "2022.2";

function moverArquivo(e) {
  //envia email com as respostas para o coordenador  
  var dadosPreenchidos = "";
  //coleta as respostas
    const resposta = e.response.getItemResponses();
  // separa as respostas entre "com upload" e "sem upload"
  const files = resposta.filter((itemResponse) => itemResponse.getItem().getType().toString() === 'FILE_UPLOAD');
  const texto = resposta.filter((itemResponse) => itemResponse.getItem().getType().toString() != 'FILE_UPLOAD');

  

  if (files.length > 0) {
    console.log("files.lenght > 0");
    const emailAluno = resposta[0].getResponse();
    console.log("email: "+emailAluno);
    const nomeAluno = resposta[1].getResponse();
    console.log("nome: "+nomeAluno);
    const cpf = resposta[3].getResponse();
    console.log("cpf: "+cpf);
    
    //varre a lista de respostas sem upload, formatando para enviar no email
    for (var k=0; k<texto.length;k++){
      var titulo = texto[k].getItem().getTitle();
      var respAluno = texto[k].getResponse();
      dadosPreenchidos = dadosPreenchidos + titulo + ": " + respAluno + "<br>";
    }

    const timeStamp = Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy-HH:mm:ss");
    //cria nova subpasta para armazenar os arquivos
    const subfolderName = "["+cpf+"] "+nomeAluno+" - "+timeStamp;
    const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    var subfolder = parentFolder.createFolder(subfolderName);

    //define acesso da pasta para privado e compartilha com as partes.
    subfolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    subfolder.addViewers([emailAluno,emailComissao]);
    var subfolderURL = "https://drive.google.com/drive/folders/" + subfolder.getId() + "?usp=sharing";

    
    //varre a lista de uploads, renomeando e movendo
    for(var i=0; i < files.length; i++){
      var nome = files[i].getItem().getTitle();
      var idArquivo = files[i].getResponse();
      console.log(idArquivo);
      //varre array de IDs dos arquivos
      for(var j=0; j<idArquivo.length; j++){
        var arquivo = DriveApp.getFileById(idArquivo[j]);
        var nomeAntigo = arquivo.getName();
        var extencao = /[^.]+$/.exec(nomeAntigo);
        extencao = "."+extencao;
        //renomeia arquivo
        if(j>0){
          //se houver mais de um arquivo, coloca numeração
          var novoNome = nome+"("+j+")"+extencao;
        }
        else{
          var novoNome = nome+extencao;
        }
        arquivo.setName(novoNome);
      }
    
      
      
      //move para a nova pasta
      arquivo.moveTo(subfolder);
    }
    enviaEmail(emailAluno,emailComissao,nomeAluno,subfolderURL,dadosPreenchidos);
  }
  else{
    console.log("nenhum arquivo encontrado. files.lenght<1");
  }
}
function enviaEmail(email1,email2,nomeAluno,linkPasta,dados){
  //obtém template do email a partir do arquivo html
  var html = HtmlService.createTemplateFromFile("email.html");
  var htmlText = html.evaluate().getContent();

  var assunto = "Inscrição no Processo Seletivo para Aluno Regular PGCC-UEFS"+" - "+ nomeAluno;
  var textBody = "Esse email requer suporte à HTML";

  htmlText = htmlText.replace(/%NomeDoAluno%/, nomeAluno);
  htmlText = htmlText.replace(/%linkDaPasta%/, linkPasta);
  htmlText = htmlText.replace(/%semestre%/, semestre);
  htmlText = htmlText.replace(/%dadosform%/, dados);

  var options = {
                htmlBody: htmlText,
                replyTo: emailComissao
            };
  GmailApp.sendEmail(email1+","+email2, assunto, textBody, options);
}
