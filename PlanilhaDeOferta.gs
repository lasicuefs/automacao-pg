//Script para formatar o formulário de intenção de matrícula com os dados das planilhas de oferta didática e de orientação

//IDs das planilhas e forms
var planilhaIntencaoID = '';
var formIntencaoID = '';
var planilhaDeOrientacaoID = '';

//inicializa sheets e form
var ss = SpreadsheetApp.getActive();
var destSheet = ss.getSheetByName('HorarioAnalitico');
var form = FormApp.openById(formIntencaoID);
var intencaoSheet = SpreadsheetApp.openById(planilhaIntencaoID);

//inicializa lista de disciplinas a partir da planilha de oferta
var disciplinas = destSheet.getRange(6,1,destSheet.getLastRow()-5,17);

//Função à ser acionada ao clicar no botão de atualizar da planilha de oferta
function update(){
  //verifica se o checkbox 'publicar?' está marcado.
  //marcado:roda a função publish() e define no form para aceitar respostas e edições de respostas
  if(destSheet.getRange(2,19).getValue()){
    publish();
    form.setAcceptingResponses(true);
    form.setAllowResponseEdits(true);
  }
  //não está marcado: define no form para não aceitar respostas e edições de respostas
  else {
    form.setAcceptingResponses(false);
    form.setAllowResponseEdits(false);
  }

  //verifica se o checkbox 'apagar respostas?' está marcado.
  if(destSheet.getRange(2,20).getValue()){
    var respostas = intencaoSheet.getSheetByName('Intenção');
    //se estiver, verifica se a quantidade de respostas no form ou na planilha é maior que 0. Para ganhar tempo no caso que seja 0.
    if(form.getResponses().length>0 || respostas.getRange('A2').getValue()!=''){
      //caso haja respostas, as apaga.
      console.log('apagando respostas');
      form.deleteAllResponses();
      
      //na aba de inteção apagamos apenas o conteúdo e as notas.
      if(respostas.getRange('A2').getValue()!=''){
        //apaga a partir da linha 2, coluna 1 até última linha, coluna 8.
        respostas.getRange(2,1,respostas.getLastRow()-1,9).clearNote();
        respostas.getRange(2,1,respostas.getLastRow()-1,9).clearContent();
      }
      
    }
    
  }
}
//Função que popula o questionário com os dados das planilhas de oferta e orientação.
function publish(){

  //A partir da planilha de oferta, identifica as disciplinas e cria um checkbox para cada uma na questão do formulário de intenção.
  var discString = disciplinas.getValues().map(function(element){return format(element);});
  var item = form.getItems(FormApp.ItemType.CHECKBOX)
    .filter(function(item){
      return item.getTitle() === 'Disciplinas e Atividades a se matricular'
    })[0].asCheckboxItem();
  var uniquedisc = removeDuplicates(discString);
  if(uniquedisc.length>0){
    item.setChoiceValues(uniquedisc);
  }
  else{
    item.setChoiceValues(['Nenhuma disciplina encontrada']);
  }
  
  //A partir da planilha de orientação, identifica os orientadores e cria multiplas escolhas para cada um na questão do formulário de intenção.
  var orientsheet = SpreadsheetApp.openById(planilhaDeOrientacaoID);
  var orientadores = orientsheet.getRange("D2:D");
  var orientString = orientadores.getValues().map(function(element){return element.toString();});
  
  var item = form.getItems(FormApp.ItemType.MULTIPLE_CHOICE)
    .filter(function(item){
      return item.getTitle() === 'Orientador'
    })[0].asMultipleChoiceItem();
  var uniqueOrient = removeDuplicates(orientString);
  if(uniqueOrient.length>0){
    item.setChoiceValues(uniqueOrient);
  }
  else{
    item.setChoiceValues(['Nenhum orientador encontrado']);
  }
  
}
//remove duplicatas em uma lista
function removeDuplicates(list){
  let unique = [];
  list.forEach((o) => {
      if (!unique.includes(o) && o !='') {
          unique.push(o);
      }
  });
  return unique;
}
//formata a string que servirá de escolha para cada disciplina.
function format(element){
  //String de exemplo:
  //< PGCC011-Computação de Alto Desempenho > Optativa - 4 créditos, TER - 7:30 às 9:30, QUI - 7:30 às 9:30, docente Angelo Duarte
  if(element[1]!=''){
    var elementArray = ['','','',''];
  elementArray[0] = "< "+element[0]+'-' + element[1]+' > ' + element[2] + ' - '+element[3]/15+' créditos';
  elementArray[1] = ', ' + element[6]+' - '+element[7]+' às '+element[8];
  elementArray[2] = ', ' + element[10]+' - '+element[11]+' às '+element[12];
  elementArray[3] = ', ' + element[15];
  var temp = '' +  elementArray[0];
  
  if(element[6]!=''){
    temp = temp + elementArray[1]; 
  }
  if(element[10]!=''){
    temp = temp + elementArray[2];
  }
  if(element[14]!=''||element[15]!=''){
    temp = temp + elementArray[3];
  }
  return temp;
  }
  else return '';
  
  
}
