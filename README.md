# ooxml-templater
Substitute placeholders into all xml content in .docx, .pptx, .xlsx including .pptx charts

**Work in progress. Not functional at this time.**

## todo
- Template pptx, docx, xlsx
- While templating: no parsing, just string substitution. 
- Pure js
- Make runnable on command line with “node”.
- Run fully in web browser
- Use zip.js for compress and extract (when running in browser, user will just include a script tag for this -- do not build it into our script. When running in nodejs, use )
- All contained .xml recursively
- Include embedded, such as xlsx within pptx for chart
- Because chart (e.g. pie chart) cache only supports numbers, anywhere within the template may be (((123456=my.placeholder))) Means go back through and substitute 123456 with the my.substitution value. Nothing is actually templated in that position; it is just a directive.
- Use Fetch API using json to get template and values
- Be efficient, eg. Only unzip a template once during the entire process
- Full documentation (update this README) on all usage and what it does exactly

### steps
- Parsing step: pass in URL to template, output all of the placeholder strings within ((()))
- produces a list of every raw placeholder with its respective path and position within the file (for use when substituting)
- take that list and create a unique list of the placeholders it needs, removing 123456= (for use in the data request step)
- Data request step: pass in a URL to post the parsing step output to there, expecting json output with a value for each placeholder
- Substitution step: pass in the results of the data request step to get the final office document
- Download step: typically the user will click a link, all of the steps will happen and the browser must download the file to the user. Download filename could be passed in. Look for a filename in the response of the data request step. Use an appropriate content type of that applies.
- Unit tests at the highest public level that contain actual test office docs.
- Create sample

## bonus todo
- (((DeletePageIfEmpty=my.placeholder))) That removes the entire docx page or pptx slide if that data value is empty

## developer notes
- Claude Code usage is encouraged, but you are responsible for every line of code it creates. Always proofread all code and documentation.
- Code should be concise, have informative function names and doc blocks 
- Code organization and quality is vital
- The most important thing: the delivered product must do exactly as described in the todo - nothing must be missing or not working
