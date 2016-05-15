const express = require('express')
const app = express()
const request = require('request')
const bodyParser = require('body-parser')
const R = require('ramda')
const hogan = require('hogan.js')

const BASE_STASH = process.env.BASE_STASH  || 'https://please-set-stash-env-variable.stash.net'
const channel = process.env.CHANNEL || '#bots'
const SLACK_HOOK = process.env.SLACK_HOOK || 'http://example.com'
const username = process.env.BOT_NAME || 'Captain Hook'
const HOOK_KEY = process.env.HOOK_KEY || 's3cr3t'
const MSG_TMPL = process.env.MSG_TMPL || "{{#people}}@{{name}} just learned about:\n{{#commits}}* <{{url}}|{{message}}>\n {{/commits}}\n{{/people}}"
const template = hogan.compile(MSG_TMPL);

const hook = `/${HOOK_KEY}`

//https://github.com/expressjs/body-parser/issues/100
app.use((req, res, next)=>{
  delete req.headers['content-encoding']
  next()
})
app.use(bodyParser.json())
app.set('port', (process.env.PORT || 5000))

const peoplereducer = (acc,value)=>{
  const url = `${BASE_STASH}${value.link.url}`
  const author = value.toCommit.author.name.toLowerCase().replace(/ /g, '.')
  const message = value.toCommit.message
  acc[author] = acc[author] || { name: author, commits: [] }
  acc[author].commits.push({message, url})
  return acc
}

app.post(hook, (req,res)=>{
  const people = R.pipe(R.reduce(peoplereducer, {}), R.values)(req.body.changesets.values)
  const text = template.render({people})
  console.log(text)

  request.post(
    {
      headers: {'content-type' : 'application/json'},
      url: SLACK_HOOK,
      body: JSON.stringify({channel, username, text})
    },
    SLACK_HOOK, (error, response, body)=>{
    if(error){
      res.status(500).end()
    }else{
      res.end()
    }
  })
})

const port = app.get('port')
app.listen(port, function() {
  console.log('-> s2s now running:', {hook, port, username, channel, BASE_STASH , SLACK_HOOK})
})
